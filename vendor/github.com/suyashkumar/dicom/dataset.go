package dicom

import (
	"encoding/binary"
	"errors"
	"fmt"
	"strings"

	"github.com/suyashkumar/dicom/pkg/tag"
	"github.com/suyashkumar/dicom/pkg/uid"
)

// ErrorElementNotFound indicates that the requested element was not found in
// the Dataset.
var ErrorElementNotFound = errors.New("element not found")

// Dataset represents a DICOM dataset, see
// http://dicom.nema.org/medical/dicom/current/output/html/part05.html#chapter_7.
//
// This Dataset representation is JSON serializable out of the box
// (implements json.Marshaler) and will also pretty print as a string nicely (see String example).
// This Dataset includes several helper methods to find Elements within this dataset or iterate over every Element
// within this Dataset (including Elements nested within Sequences).
type Dataset struct {
	Elements []*Element `json:"elements"`
}

// FindElementByTag searches through the dataset and returns a pointer to the matching element.
// It DOES NOT search within Sequences as well.
func (d *Dataset) FindElementByTag(tag tag.Tag) (*Element, error) {
	for _, e := range d.Elements {
		if e.Tag == tag {
			return e, nil
		}
	}
	return nil, ErrorElementNotFound
}

func (d *Dataset) transferSyntax() (binary.ByteOrder, bool, error) {
	elem, err := d.FindElementByTag(tag.TransferSyntaxUID)
	if err != nil {
		return nil, false, err
	}
	value, ok := elem.Value.GetValue().([]string)
	if !ok || len(value) != 1 {
		return nil, false, fmt.Errorf("failed to retrieve TransferSyntaxUID. Unable to cast elem.Value to []string")
	}
	transferSyntaxUID := value[0]
	return uid.ParseTransferSyntaxUID(transferSyntaxUID)
}

// FindElementByTagNested searches through the dataset and returns a pointer to the matching element.
// This call searches through a flat representation of the dataset, including within sequences.
func (d *Dataset) FindElementByTagNested(tag tag.Tag) (*Element, error) {
	for e := range d.FlatIterator() {
		if e.Tag == tag {
			return e, nil
		}
	}
	return nil, ErrorElementNotFound
}

// FlatIterator will be deprecated soon in favor of
// Dataset.FlatStatefulIterator. Use FlatStatefulIterator instead of this,
// unless the channel API really makes your life a lot easier (and let the
// maintainers know on GitHub).
//
// FlatIterator returns a channel upon which every element in this Dataset will
// be sent, including elements nested inside sequences.
//
// If for some reason your code will not exhaust the iterator (read all
// elements), be sure to call ExhaustElementChannel to prevent leaving the
// underlying Goroutine alive (you can safely do this in a defer).
//  c := dataset.FlatIterator()
//  defer ExhaustElementChannel(c)
//  for elem := range c {
//      // Even if you exit before reading everything in c (e.g. due to an
//      // error)
//      // things will be ok.
//  }
//
// Note that the sequence element itself is sent on the channel in addition to
// the child elements in the sequence.
// TODO(suyashkumar): decide if the sequence element itself should be sent or not
func (d *Dataset) FlatIterator() <-chan *Element {
	elemChan := make(chan *Element)
	go func() {
		flatElementsIterator(d.Elements, elemChan)
		close(elemChan)
	}()
	return elemChan
}

// ExhaustElementChannel exhausts the channel iterator returned by
// Dataset.FlatIterator, ensuring that the underlying Go routine completes.
// When using Dataset.FlatIterator, if your program will exit for some reason
// without reading all the elements of the channel, you should be sure to call
// this function to prevent a phantom Goroutine.
// Or, if you don't need the channel interface, simply use
// Dataset.FlatStatefulIterator.
func ExhaustElementChannel(c <-chan *Element) {
	for range c {
	}
}

func flatElementsIterator(elems []*Element, elemChan chan<- *Element) {
	for _, elem := range elems {
		if elem.Value.ValueType() == Sequences {
			elemChan <- elem
			for _, seqItem := range elem.Value.GetValue().([]*SequenceItemValue) {
				flatElementsIterator(seqItem.elements, elemChan)
			}
			continue
		}
		elemChan <- elem
	}
}

// FlatDatasetIterator is a stateful iterator over a Dataset.
type FlatDatasetIterator struct {
	flattenedDataset []*Element
	idx              int
}

// HasNext indicates if the iterator as another element.
func (f *FlatDatasetIterator) HasNext() bool {
	return f.idx < len(f.flattenedDataset)
}

// Next gets and returns the next element in the iterator.
func (f *FlatDatasetIterator) Next() *Element {
	elem := f.flattenedDataset[f.idx]
	f.idx++
	return elem
}

// FlatStatefulIterator returns a stateful iterator that adheres to
// FlatDatasetIterator interface. This allows the caller to iterate over every
// element in the dataset, including elements nested inside sequences.
//
// Important note: if the Dataset changes during the iteration (e.g. if elements
// are added or removed), those elements will not be included until a new
// iterator is created.
//
// If you don't need to receive elements on a channel, and don't want to worry
// about always exhausting this iterator, this is the best and safest way to
// iterate over a Dataset. Unlike FlatIterator(), no special cleanup or channel
// exhausting is needed with this iterator.
func (d *Dataset) FlatStatefulIterator() *FlatDatasetIterator {
	return &FlatDatasetIterator{flattenedDataset: flatSliceBuilder(d.Elements)}
}

func flatSliceBuilder(datasetElems []*Element) []*Element {
	var current []*Element
	for _, elem := range datasetElems {
		if elem.Value.ValueType() == Sequences {
			current = append(current, elem)
			for _, seqItem := range elem.Value.GetValue().([]*SequenceItemValue) {
				current = append(current, flatSliceBuilder(seqItem.elements)...)
			}
			continue
		}
		current = append(current, elem)
	}
	return current
}

// String returns a printable representation of this dataset as a string, including printing out elements nested inside
// sequence elements.
func (d *Dataset) String() string {
	var b strings.Builder
	b.Grow(len(d.Elements) * 100) // Underestimate of the size of the final string in an attempt to limit buffer copying
	for elem := range d.flatIteratorWithLevel() {
		tabs := buildTabs(elem.l)
		var tagName string
		if tagInfo, err := tag.Find(elem.e.Tag); err == nil {
			tagName = tagInfo.Name
		}

		b.WriteString(fmt.Sprintf("%s[\n", tabs))
		b.WriteString(fmt.Sprintf("%s  Tag: %s\n", tabs, elem.e.Tag))
		b.WriteString(fmt.Sprintf("%s  Tag Name: %s\n", tabs, tagName))
		b.WriteString(fmt.Sprintf("%s  VR: %s\n", tabs, elem.e.ValueRepresentation))
		b.WriteString(fmt.Sprintf("%s  VR Raw: %s\n", tabs, elem.e.RawValueRepresentation))
		b.WriteString(fmt.Sprintf("%s  VL: %d\n", tabs, elem.e.ValueLength))
		b.WriteString(fmt.Sprintf("%s  Value: %d\n", tabs, elem.e.Value))
		b.WriteString(fmt.Sprintf("%s]\n\n", tabs))
	}
	return b.String()
}

type elementWithLevel struct {
	e *Element
	// l represents the nesting level of the Element
	l uint
}

func (d *Dataset) flatIteratorWithLevel() <-chan *elementWithLevel {
	elemChan := make(chan *elementWithLevel)
	go func() {
		flatElementsIteratorWithLevel(d.Elements, 0, elemChan)
		close(elemChan)
	}()
	return elemChan
}

func flatElementsIteratorWithLevel(elems []*Element, level uint, eWithLevelChan chan<- *elementWithLevel) {
	for _, elem := range elems {
		if elem.Value.ValueType() == Sequences {
			eWithLevelChan <- &elementWithLevel{elem, level}
			for _, seqItem := range elem.Value.GetValue().([]*SequenceItemValue) {
				flatElementsIteratorWithLevel(seqItem.elements, level+1, eWithLevelChan)
			}
			continue
		}
		eWithLevelChan <- &elementWithLevel{elem, level}
	}
}

func buildTabs(number uint) string {
	var b strings.Builder
	b.Grow(int(number))
	for i := 0; i < int(number); i++ {
		b.WriteString("\t")
	}
	return b.String()
}
