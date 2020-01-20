package control

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/cretz/bine/torutil"
)

// EventCode represents an asynchronous event code (ref control spec 4.1).
type EventCode string

// Event codes
const (
	EventCodeAddrMap           EventCode = "ADDRMAP"
	EventCodeBandwidth         EventCode = "BW"
	EventCodeBuildTimeoutSet   EventCode = "BUILDTIMEOUT_SET"
	EventCodeCellStats         EventCode = "CELL_STATS"
	EventCodeCircuit           EventCode = "CIRC"
	EventCodeCircuitBandwidth  EventCode = "CIRC_BW"
	EventCodeCircuitMinor      EventCode = "CIRC_MINOR"
	EventCodeClientsSeen       EventCode = "CLIENTS_SEEN"
	EventCodeConfChanged       EventCode = "CONF_CHANGED"
	EventCodeConnBandwidth     EventCode = "CONN_BW"
	EventCodeDescChanged       EventCode = "DESCCHANGED"
	EventCodeGuard             EventCode = "GUARD"
	EventCodeHSDesc            EventCode = "HS_DESC"
	EventCodeHSDescContent     EventCode = "HS_DESC_CONTENT"
	EventCodeLogDebug          EventCode = "DEBUG"
	EventCodeLogErr            EventCode = "ERR"
	EventCodeLogInfo           EventCode = "INFO"
	EventCodeLogNotice         EventCode = "NOTICE"
	EventCodeLogWarn           EventCode = "WARN"
	EventCodeNetworkLiveness   EventCode = "NETWORK_LIVENESS"
	EventCodeNetworkStatus     EventCode = "NS"
	EventCodeNewConsensus      EventCode = "NEWCONSENSUS"
	EventCodeNewDesc           EventCode = "NEWDESC"
	EventCodeORConn            EventCode = "ORCONN"
	EventCodeSignal            EventCode = "SIGNAL"
	EventCodeStatusClient      EventCode = "STATUS_CLIENT"
	EventCodeStatusGeneral     EventCode = "STATUS_GENERAL"
	EventCodeStatusServer      EventCode = "STATUS_SERVER"
	EventCodeStream            EventCode = "STREAM"
	EventCodeStreamBandwidth   EventCode = "STREAM_BW"
	EventCodeTokenBucketEmpty  EventCode = "TB_EMPTY"
	EventCodeTransportLaunched EventCode = "TRANSPORT_LAUNCHED"
)

// EventCodeUnrecognized is a special event code that is only used with
// AddEventListener and RemoveEventListener to listen for events that are
// unrecognized by this library (i.e. UnrecognizedEvent).
var EventCodeUnrecognized EventCode = "<unrecognized>"

var recognizedEventCodes = []EventCode{
	EventCodeAddrMap,
	EventCodeBandwidth,
	EventCodeBuildTimeoutSet,
	EventCodeCellStats,
	EventCodeCircuit,
	EventCodeCircuitBandwidth,
	EventCodeCircuitMinor,
	EventCodeClientsSeen,
	EventCodeConfChanged,
	EventCodeConnBandwidth,
	EventCodeDescChanged,
	EventCodeGuard,
	EventCodeHSDesc,
	EventCodeHSDescContent,
	EventCodeLogDebug,
	EventCodeLogErr,
	EventCodeLogInfo,
	EventCodeLogNotice,
	EventCodeLogWarn,
	EventCodeNetworkLiveness,
	EventCodeNetworkStatus,
	EventCodeNewConsensus,
	EventCodeNewDesc,
	EventCodeORConn,
	EventCodeSignal,
	EventCodeStatusClient,
	EventCodeStatusGeneral,
	EventCodeStatusServer,
	EventCodeStream,
	EventCodeStreamBandwidth,
	EventCodeTokenBucketEmpty,
	EventCodeTransportLaunched,
}

var recognizedEventCodesByCode = mapEventCodes()

func mapEventCodes() map[EventCode]struct{} {
	ret := make(map[EventCode]struct{}, len(recognizedEventCodes))
	for _, eventCode := range recognizedEventCodes {
		ret[eventCode] = struct{}{}
	}
	return ret
}

// EventCodes returns a new slice of all event codes that are recognized (i.e.
// does not include EventCodeUnrecognized).
func EventCodes() []EventCode {
	ret := make([]EventCode, len(recognizedEventCodes))
	copy(ret, recognizedEventCodes)
	return ret
}

// ErrEventWaitSynchronousResponseOccurred is returned from EventWait (see docs)
var ErrEventWaitSynchronousResponseOccurred = errors.New("Synchronous event occurred during EventWait")

// EventWait waits for the predicate to be satisified or a non-event message to
// come through. If a non-event comes through, the error
// ErrEventWaitSynchronousResponseOccurred is returned. If there is an error in
// the predicate or if the context completes or there is an error internally
// handling the event, the error is returned. Otherwise, the event that true was
// returned from the predicate for is returned.
func (c *Conn) EventWait(
	ctx context.Context, events []EventCode, predicate func(Event) (bool, error),
) (Event, error) {
	eventCh := make(chan Event, 10)
	defer close(eventCh)
	if err := c.AddEventListener(eventCh, events...); err != nil {
		return nil, err
	}
	defer c.RemoveEventListener(eventCh, events...)
	eventCtx, eventCancel := context.WithCancel(ctx)
	defer eventCancel()
	errCh := make(chan error, 1)
	go func() { errCh <- c.HandleEvents(eventCtx) }()
	for {
		select {
		case <-eventCtx.Done():
			return nil, eventCtx.Err()
		case err := <-errCh:
			return nil, err
		case event := <-eventCh:
			if ok, err := predicate(event); err != nil {
				return nil, err
			} else if ok {
				return event, nil
			}
		}
	}
}

// HandleEvents loops until the context is closed dispatching async events. Can
// dispatch events even after context is done and of course during synchronous
// request. This will always end with an error, either from ctx.Done() or from
// an error reading/handling the event.
func (c *Conn) HandleEvents(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		for ctx.Err() == nil {
			if err := c.HandleNextEvent(); err != nil {
				errCh <- err
				break
			}
		}
	}()
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

// HandleNextEvent attempts to read and handle the next event. It will return on
// first message seen, event or not. Otherwise it will wait until there is a
// message read.
func (c *Conn) HandleNextEvent() error {
	c.readLock.Lock()
	defer c.readLock.Unlock()
	// We'll just peek for the next 3 bytes and see if they are async
	byts, err := c.conn.R.Peek(3)
	if err != nil {
		return err
	}
	statusCode, err := strconv.Atoi(string(byts))
	if err != nil || statusCode != StatusAsyncEvent {
		return err
	}
	// Read the entire thing and handle it
	resp, err := c.ReadResponse()
	if err != nil {
		return err
	}
	c.relayAsyncEvents(resp)
	return nil
}

// AddEventListener adds the given channel as an event listener for the given
// events. Then Tor is notified about which events should be listened to.
// Callers are expected to call RemoveEventListener for the channel and all
// event codes used here before closing the channel. If no events are provided,
// this is essentially a no-op. The EventCodeUnrecognized event code can be used
// to listen for unrecognized events.
func (c *Conn) AddEventListener(ch chan<- Event, events ...EventCode) error {
	c.addEventListenerToMap(ch, events...)
	// If there is an error updating the events, remove what we just added
	err := c.sendSetEvents()
	if err != nil {
		c.removeEventListenerFromMap(ch, events...)
	}
	return err
}

// RemoveEventListener removes the given channel from being sent to by the given
// event codes. It is not an error to remove a channel from events
// AddEventListener was not called for. Tor is notified about events which may
// no longer be listened to. If no events are provided, this is essentially a
// no-op.
func (c *Conn) RemoveEventListener(ch chan<- Event, events ...EventCode) error {
	c.removeEventListenerFromMap(ch, events...)
	return c.sendSetEvents()
}

func (c *Conn) addEventListenerToMap(ch chan<- Event, events ...EventCode) {
	c.eventListenersLock.Lock()
	defer c.eventListenersLock.Unlock()
	for _, event := range events {
		// Must completely replace the array, never mutate it
		prevArr := c.eventListeners[event]
		newArr := make([]chan<- Event, len(prevArr)+1)
		copy(newArr, prevArr)
		newArr[len(newArr)-1] = ch
		c.eventListeners[event] = newArr
	}
}

func (c *Conn) removeEventListenerFromMap(ch chan<- Event, events ...EventCode) {
	c.eventListenersLock.Lock()
	defer c.eventListenersLock.Unlock()
	for _, event := range events {
		arr := c.eventListeners[event]
		index := -1
		for i, listener := range arr {
			if listener == ch {
				index = i
				break
			}
		}
		if index != -1 {
			if len(arr) == 1 {
				delete(c.eventListeners, event)
			} else {
				// Must completely replace the array, never mutate it
				newArr := make([]chan<- Event, len(arr)-1)
				copy(newArr, arr[:index])
				copy(newArr[index:], arr[index+1:])
				c.eventListeners[event] = newArr
			}
		}
	}
}

func (c *Conn) sendSetEvents() error {
	c.eventListenersLock.RLock()
	cmd := "SETEVENTS"
	for event := range c.eventListeners {
		cmd += " " + string(event)
	}
	c.eventListenersLock.RUnlock()
	return c.sendRequestIgnoreResponse(cmd)
}

func (c *Conn) relayAsyncEvents(resp *Response) {
	var code, data string
	var dataArray []string
	if len(resp.Data) == 1 {
		// On single line, part up to space, newline, or EOL is the code, rest is data
		if index := strings.Index(resp.Data[0], " "); index != -1 {
			code, data = resp.Data[0][:index], resp.Data[0][index+1:]
		} else if index := strings.Index(resp.Data[0], "\r\n"); index != -1 {
			code, data = resp.Data[0][:index], resp.Data[0][index+2:]
		} else {
			code, data = resp.Data[0], ""
		}
	} else if len(resp.Data) > 0 {
		// If there are multiple lines, the entire first line is the code
		code, dataArray = resp.Data[0], resp.Data[1:]
	} else {
		// Otherwise, the reply line has the data
		code, data, _ = torutil.PartitionString(resp.Reply, ' ')
	}
	// Only relay if there are chans
	eventCode := EventCode(code)
	c.eventListenersLock.RLock()
	chans := c.eventListeners[eventCode]
	if _, ok := recognizedEventCodesByCode[eventCode]; !ok {
		chans = append(chans, c.eventListeners[EventCodeUnrecognized]...)
	}
	c.eventListenersLock.RUnlock()
	if len(chans) == 0 {
		return
	}
	// Parse the event and only send if known event
	if event := ParseEvent(eventCode, data, dataArray); event != nil {
		for _, ch := range chans {
			// Just send, if closed or blocking, that's not our problem
			ch <- event
		}
	}
}

// Zero on fail
func parseISOTime(str string) time.Time {
	// Essentially time.RFC3339 but without 'T' or TZ info
	const layout = "2006-01-02 15:04:05"
	ret, err := time.Parse(layout, str)
	if err != nil {
		ret = time.Time{}
	}
	return ret
}

// Zero on fail
func parseISOTime2Frac(str string) time.Time {
	// Essentially time.RFC3339Nano but without TZ info
	const layout = "2006-01-02T15:04:05.999999999"
	ret, err := time.Parse(layout, str)
	if err != nil {
		ret = time.Time{}
	}
	return ret
}

// Event is the base interface for all known asynchronous events.
type Event interface {
	Code() EventCode
}

// ParseEvent returns an Event for the given code and data info. Raw is the raw
// single line if it is a single-line event (even if it has newlines), dataArray
// is the array of lines for multi-line events. Only one of the two needs to be
// set. The response is never nil, but may be UnrecognizedEvent. Format errors
// are ignored per the Tor spec.
func ParseEvent(code EventCode, raw string, dataArray []string) Event {
	switch code {
	case EventCodeAddrMap:
		return ParseAddrMapEvent(raw)
	case EventCodeBandwidth:
		return ParseBandwidthEvent(raw)
	case EventCodeBuildTimeoutSet:
		return ParseBuildTimeoutSetEvent(raw)
	case EventCodeCellStats:
		return ParseCellStatsEvent(raw)
	case EventCodeCircuit:
		return ParseCircuitEvent(raw)
	case EventCodeCircuitBandwidth:
		return ParseCircuitBandwidthEvent(raw)
	case EventCodeCircuitMinor:
		return ParseCircuitMinorEvent(raw)
	case EventCodeClientsSeen:
		return ParseClientsSeenEvent(raw)
	case EventCodeConfChanged:
		return ParseConfChangedEvent(dataArray)
	case EventCodeConnBandwidth:
		return ParseConnBandwidthEvent(raw)
	case EventCodeDescChanged:
		return ParseDescChangedEvent(raw)
	case EventCodeGuard:
		return ParseGuardEvent(raw)
	case EventCodeHSDesc:
		return ParseHSDescEvent(raw)
	case EventCodeHSDescContent:
		return ParseHSDescContentEvent(raw)
	case EventCodeLogDebug, EventCodeLogErr, EventCodeLogInfo, EventCodeLogNotice, EventCodeLogWarn:
		return ParseLogEvent(code, raw)
	case EventCodeNetworkLiveness:
		return ParseNetworkLivenessEvent(raw)
	case EventCodeNetworkStatus:
		return ParseNetworkStatusEvent(raw)
	case EventCodeNewConsensus:
		return ParseNewConsensusEvent(raw)
	case EventCodeNewDesc:
		return ParseNewDescEvent(raw)
	case EventCodeORConn:
		return ParseORConnEvent(raw)
	case EventCodeSignal:
		return ParseSignalEvent(raw)
	case EventCodeStatusClient, EventCodeStatusGeneral, EventCodeStatusServer:
		return ParseStatusEvent(code, raw)
	case EventCodeStream:
		return ParseStreamEvent(raw)
	case EventCodeStreamBandwidth:
		return ParseStreamBandwidthEvent(raw)
	case EventCodeTokenBucketEmpty:
		return ParseTokenBucketEmptyEvent(raw)
	case EventCodeTransportLaunched:
		return ParseTransportLaunchedEvent(raw)
	default:
		return ParseUnrecognizedEvent(code, raw, dataArray)
	}
}

// CircuitEvent is CIRC in spec.
type CircuitEvent struct {
	Raw           string
	CircuitID     string
	Status        string
	Path          []string
	BuildFlags    []string
	Purpose       string
	HSState       string
	RendQuery     string
	TimeCreated   time.Time
	Reason        string
	RemoteReason  string
	SocksUsername string
	SocksPassword string
}

// ParseCircuitEvent parses the event.
func ParseCircuitEvent(raw string) *CircuitEvent {
	event := &CircuitEvent{Raw: raw}
	event.CircuitID, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.Status, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	first := true
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "BUILD_FLAGS":
			event.BuildFlags = strings.Split(val, ",")
		case "PURPOSE":
			event.Purpose = val
		case "HS_STATE":
			event.HSState = val
		case "REND_QUERY":
			event.RendQuery = val
		case "TIME_CREATED":
			event.TimeCreated = parseISOTime2Frac(val)
		case "REASON":
			event.Reason = val
		case "REMOTE_REASON":
			event.RemoteReason = val
		case "SOCKS_USERNAME":
			event.SocksUsername = val
		case "SOCKS_PASSWORD":
			event.SocksPassword = val
		default:
			if first {
				event.Path = strings.Split(val, ",")
			}
		}
		first = false
	}
	return event
}

// Code implements Event.Code
func (*CircuitEvent) Code() EventCode { return EventCodeCircuit }

// StreamEvent is STREAM in spec.
type StreamEvent struct {
	Raw           string
	StreamID      string
	Status        string
	CircuitID     string
	TargetAddress string
	TargetPort    int
	Reason        string
	RemoteReason  string
	Source        string
	SourceAddress string
	SourcePort    int
	Purpose       string
}

// ParseStreamEvent parses the event.
func ParseStreamEvent(raw string) *StreamEvent {
	event := &StreamEvent{Raw: raw}
	event.StreamID, raw, _ = torutil.PartitionString(raw, ' ')
	event.Status, raw, _ = torutil.PartitionString(raw, ' ')
	event.CircuitID, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.TargetAddress, raw, ok = torutil.PartitionString(raw, ' ')
	if target, port, hasPort := torutil.PartitionStringFromEnd(event.TargetAddress, ':'); hasPort {
		event.TargetAddress = target
		event.TargetPort, _ = strconv.Atoi(port)
	}
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "REASON":
			event.Reason = val
		case "REMOTE_REASON":
			event.RemoteReason = val
		case "SOURCE":
			event.Source = val
		case "SOURCE_ADDR":
			event.SourceAddress = val
			if source, port, hasPort := torutil.PartitionStringFromEnd(event.SourceAddress, ':'); hasPort {
				event.SourceAddress = source
				event.SourcePort, _ = strconv.Atoi(port)
			}
		case "PURPOSE":
			event.Purpose = val
		}
	}
	return event
}

// Code implements Event.Code
func (*StreamEvent) Code() EventCode { return EventCodeStream }

// ORConnEvent is ORCONN in spec.
type ORConnEvent struct {
	Raw         string
	Target      string
	Status      string
	Reason      string
	NumCircuits int
	ConnID      string
}

// ParseORConnEvent parses the event.
func ParseORConnEvent(raw string) *ORConnEvent {
	event := &ORConnEvent{Raw: raw}
	event.Target, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.Status, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "REASON":
			event.Reason = val
		case "NCIRCS":
			event.NumCircuits, _ = strconv.Atoi(val)
		case "ID":
			event.ConnID = val
		}
	}
	return event
}

// Code implements Event.Code
func (*ORConnEvent) Code() EventCode { return EventCodeORConn }

// BandwidthEvent is BW in spec.
type BandwidthEvent struct {
	Raw          string
	BytesRead    int64
	BytesWritten int64
}

// ParseBandwidthEvent parses the event.
func ParseBandwidthEvent(raw string) *BandwidthEvent {
	event := &BandwidthEvent{Raw: raw}
	var temp string
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	event.BytesRead, _ = strconv.ParseInt(temp, 10, 64)
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	event.BytesWritten, _ = strconv.ParseInt(temp, 10, 64)
	return event
}

// Code implements Event.Code
func (*BandwidthEvent) Code() EventCode { return EventCodeBandwidth }

// LogEvent is DEBUG, ERR, INFO, NOTICE, and WARN in spec.
type LogEvent struct {
	Severity EventCode
	Raw      string
}

// ParseLogEvent parses the event.
func ParseLogEvent(severity EventCode, raw string) *LogEvent {
	return &LogEvent{Severity: severity, Raw: raw}
}

// Code implements Event.Code
func (l *LogEvent) Code() EventCode { return l.Severity }

// NewDescEvent is NEWDESC in spec.
type NewDescEvent struct {
	Raw   string
	Descs []string
}

// ParseNewDescEvent parses the event.
func ParseNewDescEvent(raw string) *NewDescEvent {
	return &NewDescEvent{Raw: raw, Descs: strings.Split(raw, " ")}
}

// Code implements Event.Code
func (*NewDescEvent) Code() EventCode { return EventCodeNewDesc }

// AddrMapEvent is ADDRMAP in spec.
type AddrMapEvent struct {
	Raw        string
	Address    string
	NewAddress string
	ErrorCode  string
	// Zero if no expire
	Expires time.Time
	// Sans double quotes
	Cached string
}

// ParseAddrMapEvent parses the event.
func ParseAddrMapEvent(raw string) *AddrMapEvent {
	event := &AddrMapEvent{Raw: raw}
	event.Address, raw, _ = torutil.PartitionString(raw, ' ')
	event.NewAddress, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	// Skip local expiration, use UTC one later
	_, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "error":
			event.ErrorCode = val
		case "EXPIRES":
			val, _ = torutil.UnescapeSimpleQuotedString(val)
			event.Expires = parseISOTime(val)
		case "CACHED":
			event.Cached, _ = torutil.UnescapeSimpleQuotedStringIfNeeded(val)
		}
	}
	return event
}

// Code implements Event.Code
func (*AddrMapEvent) Code() EventCode { return EventCodeAddrMap }

// DescChangedEvent is DESCCHANGED in spec.
type DescChangedEvent struct {
	Raw string
}

// ParseDescChangedEvent parses the event.
func ParseDescChangedEvent(raw string) *DescChangedEvent {
	return &DescChangedEvent{Raw: raw}
}

// Code implements Event.Code
func (*DescChangedEvent) Code() EventCode { return EventCodeDescChanged }

// StatusEvent is STATUS_CLIENT, STATUS_GENERAL, and STATUS_SERVER in spec.
type StatusEvent struct {
	Raw       string
	Type      EventCode
	Severity  string
	Action    string
	Arguments map[string]string
}

// ParseStatusEvent parses the event.
func ParseStatusEvent(typ EventCode, raw string) *StatusEvent {
	event := &StatusEvent{Raw: raw, Type: typ, Arguments: map[string]string{}}
	event.Severity, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.Action, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		event.Arguments[key], _ = torutil.UnescapeSimpleQuotedStringIfNeeded(val)
	}
	return event
}

// Code implements Event.Code
func (s *StatusEvent) Code() EventCode { return s.Type }

// GuardEvent is GUARD in spec.
type GuardEvent struct {
	Raw    string
	Type   string
	Name   string
	Status string
}

// ParseGuardEvent parses the event.
func ParseGuardEvent(raw string) *GuardEvent {
	event := &GuardEvent{Raw: raw}
	event.Type, raw, _ = torutil.PartitionString(raw, ' ')
	event.Name, raw, _ = torutil.PartitionString(raw, ' ')
	event.Status, raw, _ = torutil.PartitionString(raw, ' ')
	return event
}

// Code implements Event.Code
func (*GuardEvent) Code() EventCode { return EventCodeGuard }

// NetworkStatusEvent is NS in spec.
type NetworkStatusEvent struct {
	Raw string
}

// ParseNetworkStatusEvent parses the event.
func ParseNetworkStatusEvent(raw string) *NetworkStatusEvent {
	return &NetworkStatusEvent{Raw: raw}
}

// Code implements Event.Code
func (*NetworkStatusEvent) Code() EventCode { return EventCodeNetworkStatus }

// StreamBandwidthEvent is STREAM_BW in spec.
type StreamBandwidthEvent struct {
	Raw          string
	BytesRead    int64
	BytesWritten int64
	Time         time.Time
}

// ParseStreamBandwidthEvent parses the event.
func ParseStreamBandwidthEvent(raw string) *StreamBandwidthEvent {
	event := &StreamBandwidthEvent{Raw: raw}
	var temp string
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	event.BytesRead, _ = strconv.ParseInt(temp, 10, 64)
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	event.BytesWritten, _ = strconv.ParseInt(temp, 10, 64)
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	temp, _ = torutil.UnescapeSimpleQuotedString(temp)
	event.Time = parseISOTime2Frac(temp)
	return event
}

// Code implements Event.Code
func (*StreamBandwidthEvent) Code() EventCode { return EventCodeStreamBandwidth }

// ClientsSeenEvent is CLIENTS_SEEN in spec.
type ClientsSeenEvent struct {
	Raw            string
	TimeStarted    time.Time
	CountrySummary map[string]int
	IPVersions     map[string]int
}

// ParseClientsSeenEvent parses the event.
func ParseClientsSeenEvent(raw string) *ClientsSeenEvent {
	event := &ClientsSeenEvent{Raw: raw}
	var temp string
	var ok bool
	temp, raw, ok = torutil.PartitionString(raw, ' ')
	temp, _ = torutil.UnescapeSimpleQuotedString(temp)
	event.TimeStarted = parseISOTime(temp)
	strToMap := func(str string) map[string]int {
		ret := map[string]int{}
		for _, keyVal := range strings.Split(str, ",") {
			key, val, _ := torutil.PartitionString(keyVal, '=')
			ret[key], _ = strconv.Atoi(val)
		}
		return ret
	}
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "CountrySummary":
			event.CountrySummary = strToMap(val)
		case "IPVersions":
			event.IPVersions = strToMap(val)
		}
	}
	return event
}

// Code implements Event.Code
func (*ClientsSeenEvent) Code() EventCode { return EventCodeClientsSeen }

// NewConsensusEvent is NEWCONSENSUS in spec.
type NewConsensusEvent struct {
	Raw string
}

// ParseNewConsensusEvent parses the event.
func ParseNewConsensusEvent(raw string) *NewConsensusEvent {
	return &NewConsensusEvent{Raw: raw}
}

// Code implements Event.Code
func (*NewConsensusEvent) Code() EventCode { return EventCodeNewConsensus }

// BuildTimeoutSetEvent is BUILDTIMEOUT_SET in spec.
type BuildTimeoutSetEvent struct {
	Raw          string
	Type         string
	TotalTimes   int
	Timeout      time.Duration
	Xm           int
	Alpha        float32
	Quantile     float32
	TimeoutRate  float32
	CloseTimeout time.Duration
	CloseRate    float32
}

// ParseBuildTimeoutSetEvent parses the event.
func ParseBuildTimeoutSetEvent(raw string) *BuildTimeoutSetEvent {
	event := &BuildTimeoutSetEvent{Raw: raw}
	var ok bool
	event.Type, raw, ok = torutil.PartitionString(raw, ' ')
	_, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	parseFloat := func(val string) float32 {
		f, _ := strconv.ParseFloat(val, 32)
		return float32(f)
	}
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "TOTAL_TIMES":
			event.TotalTimes, _ = strconv.Atoi(val)
		case "TIMEOUT_MS":
			if ms, err := strconv.ParseInt(val, 10, 64); err == nil {
				event.Timeout = time.Duration(ms) * time.Millisecond
			}
		case "XM":
			event.Xm, _ = strconv.Atoi(val)
		case "ALPHA":
			event.Alpha = parseFloat(val)
		case "CUTOFF_QUANTILE":
			event.Quantile = parseFloat(val)
		case "TIMEOUT_RATE":
			event.TimeoutRate = parseFloat(val)
		case "CLOSE_MS":
			if ms, err := strconv.ParseInt(val, 10, 64); err == nil {
				event.CloseTimeout = time.Duration(ms) * time.Millisecond
			}
		case "CLOSE_RATE":
			event.CloseRate = parseFloat(val)
		}
	}
	return event
}

// Code implements Event.Code
func (*BuildTimeoutSetEvent) Code() EventCode { return EventCodeBuildTimeoutSet }

// SignalEvent is SIGNAL in spec.
type SignalEvent struct {
	Raw string
}

// ParseSignalEvent parses the event.
func ParseSignalEvent(raw string) *SignalEvent {
	return &SignalEvent{Raw: raw}
}

// Code implements Event.Code
func (*SignalEvent) Code() EventCode { return EventCodeSignal }

// ConfChangedEvent is CONF_CHANGED in spec.
type ConfChangedEvent struct {
	Raw []string
}

// ParseConfChangedEvent parses the event.
func ParseConfChangedEvent(raw []string) *ConfChangedEvent {
	// TODO: break into KeyVal and unescape strings
	return &ConfChangedEvent{Raw: raw}
}

// Code implements Event.Code
func (*ConfChangedEvent) Code() EventCode { return EventCodeConfChanged }

// CircuitMinorEvent is CIRC_MINOR in spec.
type CircuitMinorEvent struct {
	Raw         string
	CircuitID   string
	Event       string
	Path        []string
	BuildFlags  []string
	Purpose     string
	HSState     string
	RendQuery   string
	TimeCreated time.Time
	OldPurpose  string
	OldHSState  string
}

// ParseCircuitMinorEvent parses the event.
func ParseCircuitMinorEvent(raw string) *CircuitMinorEvent {
	event := &CircuitMinorEvent{Raw: raw}
	event.CircuitID, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.Event, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	first := true
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "BUILD_FLAGS":
			event.BuildFlags = strings.Split(val, ",")
		case "PURPOSE":
			event.Purpose = val
		case "HS_STATE":
			event.HSState = val
		case "REND_QUERY":
			event.RendQuery = val
		case "TIME_CREATED":
			event.TimeCreated = parseISOTime2Frac(val)
		case "OLD_PURPOSE":
			event.OldPurpose = val
		case "OLD_HS_STATE":
			event.OldHSState = val
		default:
			if first {
				event.Path = strings.Split(val, ",")
			}
		}
		first = false
	}
	return event
}

// Code implements Event.Code
func (*CircuitMinorEvent) Code() EventCode { return EventCodeCircuitMinor }

// TransportLaunchedEvent is TRANSPORT_LAUNCHED in spec.
type TransportLaunchedEvent struct {
	Raw     string
	Type    string
	Name    string
	Address string
	Port    int
}

// ParseTransportLaunchedEvent parses the event.
func ParseTransportLaunchedEvent(raw string) *TransportLaunchedEvent {
	event := &TransportLaunchedEvent{Raw: raw}
	event.Type, raw, _ = torutil.PartitionString(raw, ' ')
	event.Name, raw, _ = torutil.PartitionString(raw, ' ')
	event.Address, raw, _ = torutil.PartitionString(raw, ' ')
	var temp string
	temp, raw, _ = torutil.PartitionString(raw, ' ')
	event.Port, _ = strconv.Atoi(temp)
	return event
}

// Code implements Event.Code
func (*TransportLaunchedEvent) Code() EventCode { return EventCodeTransportLaunched }

// ConnBandwidthEvent is CONN_BW in spec.
type ConnBandwidthEvent struct {
	Raw          string
	ConnID       string
	ConnType     string
	BytesRead    int64
	BytesWritten int64
}

// ParseConnBandwidthEvent parses the event.
func ParseConnBandwidthEvent(raw string) *ConnBandwidthEvent {
	event := &ConnBandwidthEvent{Raw: raw}
	ok := true
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "ID":
			event.ConnID = val
		case "TYPE":
			event.ConnType = val
		case "READ":
			event.BytesRead, _ = strconv.ParseInt(val, 10, 64)
		case "WRITTEN":
			event.BytesWritten, _ = strconv.ParseInt(val, 10, 64)
		}
	}
	return event
}

// Code implements Event.Code
func (*ConnBandwidthEvent) Code() EventCode { return EventCodeConnBandwidth }

// CircuitBandwidthEvent is CIRC_BW in spec.
type CircuitBandwidthEvent struct {
	Raw          string
	CircuitID    string
	BytesRead    int64
	BytesWritten int64
	Time         time.Time
}

// ParseCircuitBandwidthEvent parses the event.
func ParseCircuitBandwidthEvent(raw string) *CircuitBandwidthEvent {
	event := &CircuitBandwidthEvent{Raw: raw}
	ok := true
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "ID":
			event.CircuitID = val
		case "READ":
			event.BytesRead, _ = strconv.ParseInt(val, 10, 64)
		case "WRITTEN":
			event.BytesWritten, _ = strconv.ParseInt(val, 10, 64)
		case "TIME":
			event.Time = parseISOTime2Frac(val)
		}
	}
	return event
}

// Code implements Event.Code
func (*CircuitBandwidthEvent) Code() EventCode { return EventCodeCircuitBandwidth }

// CellStatsEvent is CELL_STATS in spec.
type CellStatsEvent struct {
	Raw             string
	CircuitID       string
	InboundQueueID  string
	InboundConnID   string
	InboundAdded    map[string]int
	InboundRemoved  map[string]int
	InboundTime     map[string]int
	OutboundQueueID string
	OutboundConnID  string
	OutboundAdded   map[string]int
	OutboundRemoved map[string]int
	OutboundTime    map[string]int
}

// ParseCellStatsEvent parses the event.
func ParseCellStatsEvent(raw string) *CellStatsEvent {
	event := &CellStatsEvent{Raw: raw}
	ok := true
	var attr string
	toIntMap := func(val string) map[string]int {
		ret := map[string]int{}
		for _, v := range strings.Split(val, ",") {
			key, val, _ := torutil.PartitionString(v, ':')
			ret[key], _ = strconv.Atoi(val)
		}
		return ret
	}
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "ID":
			event.CircuitID = val
		case "InboundQueue":
			event.InboundQueueID = val
		case "InboundConn":
			event.InboundConnID = val
		case "InboundAdded":
			event.InboundAdded = toIntMap(val)
		case "InboundRemoved":
			event.InboundRemoved = toIntMap(val)
		case "InboundTime":
			event.OutboundTime = toIntMap(val)
		case "OutboundQueue":
			event.OutboundQueueID = val
		case "OutboundConn":
			event.OutboundConnID = val
		case "OutboundAdded":
			event.OutboundAdded = toIntMap(val)
		case "OutboundRemoved":
			event.OutboundRemoved = toIntMap(val)
		case "OutboundTime":
			event.OutboundTime = toIntMap(val)
		}
	}
	return event
}

// Code implements Event.Code
func (*CellStatsEvent) Code() EventCode { return EventCodeCellStats }

// TokenBucketEmptyEvent is TB_EMPTY in spec.
type TokenBucketEmptyEvent struct {
	Raw              string
	BucketName       string
	ConnID           string
	ReadBucketEmpty  time.Duration
	WriteBucketEmpty time.Duration
	LastRefil        time.Duration
}

// ParseTokenBucketEmptyEvent parses the event.
func ParseTokenBucketEmptyEvent(raw string) *TokenBucketEmptyEvent {
	event := &TokenBucketEmptyEvent{Raw: raw}
	var ok bool
	event.BucketName, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, _ := torutil.PartitionString(attr, '=')
		switch key {
		case "ID":
			event.ConnID = val
		case "READ":
			i, _ := strconv.ParseInt(val, 10, 64)
			event.ReadBucketEmpty = time.Duration(i) * time.Millisecond
		case "WRITTEN":
			i, _ := strconv.ParseInt(val, 10, 64)
			event.WriteBucketEmpty = time.Duration(i) * time.Millisecond
		case "LAST":
			i, _ := strconv.ParseInt(val, 10, 64)
			event.LastRefil = time.Duration(i) * time.Millisecond
		}
	}
	return event
}

// Code implements Event.Code
func (*TokenBucketEmptyEvent) Code() EventCode { return EventCodeTokenBucketEmpty }

// HSDescEvent is HS_DESC in spec.
type HSDescEvent struct {
	Raw        string
	Action     string
	Address    string
	AuthType   string
	HSDir      string
	DescID     string
	Reason     string
	Replica    int
	HSDirIndex string
}

// ParseHSDescEvent parses the event.
func ParseHSDescEvent(raw string) *HSDescEvent {
	event := &HSDescEvent{Raw: raw}
	event.Action, raw, _ = torutil.PartitionString(raw, ' ')
	event.Address, raw, _ = torutil.PartitionString(raw, ' ')
	event.AuthType, raw, _ = torutil.PartitionString(raw, ' ')
	var ok bool
	event.HSDir, raw, ok = torutil.PartitionString(raw, ' ')
	var attr string
	first := true
	for ok {
		attr, raw, ok = torutil.PartitionString(raw, ' ')
		key, val, valOk := torutil.PartitionString(attr, '=')
		switch key {
		case "REASON":
			event.Reason = val
		case "REPLICA":
			event.Replica, _ = strconv.Atoi(val)
		case "HSDIR_INDEX":
			event.HSDirIndex = val
		default:
			if first && !valOk {
				event.DescID = attr
			}
		}
		first = false
	}
	return event
}

// Code implements Event.Code
func (*HSDescEvent) Code() EventCode { return EventCodeHSDesc }

// HSDescContentEvent is HS_DESC_CONTENT in spec.
type HSDescContentEvent struct {
	Raw        string
	Address    string
	DescID     string
	HSDir      string
	Descriptor string
}

// ParseHSDescContentEvent parses the event.
func ParseHSDescContentEvent(raw string) *HSDescContentEvent {
	event := &HSDescContentEvent{Raw: raw}
	event.Address, raw, _ = torutil.PartitionString(raw, ' ')
	event.DescID, raw, _ = torutil.PartitionString(raw, ' ')
	newlineIndex := strings.Index(raw, "\r\n")
	if newlineIndex != -1 {
		event.HSDir, event.Descriptor = raw[:newlineIndex], raw[newlineIndex+2:]
	}
	return event
}

// Code implements Event.Code
func (*HSDescContentEvent) Code() EventCode { return EventCodeHSDescContent }

// NetworkLivenessEvent is NETWORK_LIVENESS in spec.
type NetworkLivenessEvent struct {
	Raw string
}

// ParseNetworkLivenessEvent parses the event.
func ParseNetworkLivenessEvent(raw string) *NetworkLivenessEvent {
	return &NetworkLivenessEvent{Raw: raw}
}

// Code implements Event.Code
func (*NetworkLivenessEvent) Code() EventCode { return EventCodeNetworkLiveness }

// UnrecognizedEvent is any unrecognized event code.
type UnrecognizedEvent struct {
	EventCode     EventCode
	RawSingleLine string
	RawMultiLine  []string
}

// ParseUnrecognizedEvent creates an unrecognized event with the given values.
func ParseUnrecognizedEvent(eventCode EventCode, rawSingleLine string, rawMultiLine []string) *UnrecognizedEvent {
	return &UnrecognizedEvent{EventCode: eventCode, RawSingleLine: rawSingleLine, RawMultiLine: rawMultiLine}
}

// Code implements Event.Code
func (u *UnrecognizedEvent) Code() EventCode { return u.EventCode }
