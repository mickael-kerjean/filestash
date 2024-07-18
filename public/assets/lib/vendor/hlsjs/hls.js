// @ts-nocheck
function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var urlToolkit = {exports: {}};

(function (module, exports) {
	// see https://tools.ietf.org/html/rfc1808

	(function (root) {
	  var URL_REGEX =
	    /^(?=((?:[a-zA-Z0-9+\-.]+:)?))\1(?=((?:\/\/[^\/?#]*)?))\2(?=((?:(?:[^?#\/]*\/)*[^;?#\/]*)?))\3((?:;[^?#]*)?)(\?[^#]*)?(#[^]*)?$/;
	  var FIRST_SEGMENT_REGEX = /^(?=([^\/?#]*))\1([^]*)$/;
	  var SLASH_DOT_REGEX = /(?:\/|^)\.(?=\/)/g;
	  var SLASH_DOT_DOT_REGEX = /(?:\/|^)\.\.\/(?!\.\.\/)[^\/]*(?=\/)/g;

	  var URLToolkit = {
	    // If opts.alwaysNormalize is true then the path will always be normalized even when it starts with / or //
	    // E.g
	    // With opts.alwaysNormalize = false (default, spec compliant)
	    // http://a.com/b/cd + /e/f/../g => http://a.com/e/f/../g
	    // With opts.alwaysNormalize = true (not spec compliant)
	    // http://a.com/b/cd + /e/f/../g => http://a.com/e/g
	    buildAbsoluteURL: function (baseURL, relativeURL, opts) {
	      opts = opts || {};
	      // remove any remaining space and CRLF
	      baseURL = baseURL.trim();
	      relativeURL = relativeURL.trim();
	      if (!relativeURL) {
	        // 2a) If the embedded URL is entirely empty, it inherits the
	        // entire base URL (i.e., is set equal to the base URL)
	        // and we are done.
	        if (!opts.alwaysNormalize) {
	          return baseURL;
	        }
	        var basePartsForNormalise = URLToolkit.parseURL(baseURL);
	        if (!basePartsForNormalise) {
	          throw new Error('Error trying to parse base URL.');
	        }
	        basePartsForNormalise.path = URLToolkit.normalizePath(
	          basePartsForNormalise.path
	        );
	        return URLToolkit.buildURLFromParts(basePartsForNormalise);
	      }
	      var relativeParts = URLToolkit.parseURL(relativeURL);
	      if (!relativeParts) {
	        throw new Error('Error trying to parse relative URL.');
	      }
	      if (relativeParts.scheme) {
	        // 2b) If the embedded URL starts with a scheme name, it is
	        // interpreted as an absolute URL and we are done.
	        if (!opts.alwaysNormalize) {
	          return relativeURL;
	        }
	        relativeParts.path = URLToolkit.normalizePath(relativeParts.path);
	        return URLToolkit.buildURLFromParts(relativeParts);
	      }
	      var baseParts = URLToolkit.parseURL(baseURL);
	      if (!baseParts) {
	        throw new Error('Error trying to parse base URL.');
	      }
	      if (!baseParts.netLoc && baseParts.path && baseParts.path[0] !== '/') {
	        // If netLoc missing and path doesn't start with '/', assume everthing before the first '/' is the netLoc
	        // This causes 'example.com/a' to be handled as '//example.com/a' instead of '/example.com/a'
	        var pathParts = FIRST_SEGMENT_REGEX.exec(baseParts.path);
	        baseParts.netLoc = pathParts[1];
	        baseParts.path = pathParts[2];
	      }
	      if (baseParts.netLoc && !baseParts.path) {
	        baseParts.path = '/';
	      }
	      var builtParts = {
	        // 2c) Otherwise, the embedded URL inherits the scheme of
	        // the base URL.
	        scheme: baseParts.scheme,
	        netLoc: relativeParts.netLoc,
	        path: null,
	        params: relativeParts.params,
	        query: relativeParts.query,
	        fragment: relativeParts.fragment,
	      };
	      if (!relativeParts.netLoc) {
	        // 3) If the embedded URL's <net_loc> is non-empty, we skip to
	        // Step 7.  Otherwise, the embedded URL inherits the <net_loc>
	        // (if any) of the base URL.
	        builtParts.netLoc = baseParts.netLoc;
	        // 4) If the embedded URL path is preceded by a slash "/", the
	        // path is not relative and we skip to Step 7.
	        if (relativeParts.path[0] !== '/') {
	          if (!relativeParts.path) {
	            // 5) If the embedded URL path is empty (and not preceded by a
	            // slash), then the embedded URL inherits the base URL path
	            builtParts.path = baseParts.path;
	            // 5a) if the embedded URL's <params> is non-empty, we skip to
	            // step 7; otherwise, it inherits the <params> of the base
	            // URL (if any) and
	            if (!relativeParts.params) {
	              builtParts.params = baseParts.params;
	              // 5b) if the embedded URL's <query> is non-empty, we skip to
	              // step 7; otherwise, it inherits the <query> of the base
	              // URL (if any) and we skip to step 7.
	              if (!relativeParts.query) {
	                builtParts.query = baseParts.query;
	              }
	            }
	          } else {
	            // 6) The last segment of the base URL's path (anything
	            // following the rightmost slash "/", or the entire path if no
	            // slash is present) is removed and the embedded URL's path is
	            // appended in its place.
	            var baseURLPath = baseParts.path;
	            var newPath =
	              baseURLPath.substring(0, baseURLPath.lastIndexOf('/') + 1) +
	              relativeParts.path;
	            builtParts.path = URLToolkit.normalizePath(newPath);
	          }
	        }
	      }
	      if (builtParts.path === null) {
	        builtParts.path = opts.alwaysNormalize
	          ? URLToolkit.normalizePath(relativeParts.path)
	          : relativeParts.path;
	      }
	      return URLToolkit.buildURLFromParts(builtParts);
	    },
	    parseURL: function (url) {
	      var parts = URL_REGEX.exec(url);
	      if (!parts) {
	        return null;
	      }
	      return {
	        scheme: parts[1] || '',
	        netLoc: parts[2] || '',
	        path: parts[3] || '',
	        params: parts[4] || '',
	        query: parts[5] || '',
	        fragment: parts[6] || '',
	      };
	    },
	    normalizePath: function (path) {
	      // The following operations are
	      // then applied, in order, to the new path:
	      // 6a) All occurrences of "./", where "." is a complete path
	      // segment, are removed.
	      // 6b) If the path ends with "." as a complete path segment,
	      // that "." is removed.
	      path = path.split('').reverse().join('').replace(SLASH_DOT_REGEX, '');
	      // 6c) All occurrences of "<segment>/../", where <segment> is a
	      // complete path segment not equal to "..", are removed.
	      // Removal of these path segments is performed iteratively,
	      // removing the leftmost matching pattern on each iteration,
	      // until no matching pattern remains.
	      // 6d) If the path ends with "<segment>/..", where <segment> is a
	      // complete path segment not equal to "..", that
	      // "<segment>/.." is removed.
	      while (
	        path.length !== (path = path.replace(SLASH_DOT_DOT_REGEX, '')).length
	      ) {}
	      return path.split('').reverse().join('');
	    },
	    buildURLFromParts: function (parts) {
	      return (
	        parts.scheme +
	        parts.netLoc +
	        parts.path +
	        parts.params +
	        parts.query +
	        parts.fragment
	      );
	    },
	  };

	  module.exports = URLToolkit;
	})();
} (urlToolkit));

var urlToolkitExports = urlToolkit.exports;

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

// https://caniuse.com/mdn-javascript_builtins_number_isfinite
const isFiniteNumber = Number.isFinite || function (value) {
  return typeof value === 'number' && isFinite(value);
};

// https://caniuse.com/mdn-javascript_builtins_number_issafeinteger
const isSafeInteger = Number.isSafeInteger || function (value) {
  return typeof value === 'number' && Math.abs(value) <= MAX_SAFE_INTEGER;
};
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

let Events = /*#__PURE__*/function (Events) {
  Events["MEDIA_ATTACHING"] = "hlsMediaAttaching";
  Events["MEDIA_ATTACHED"] = "hlsMediaAttached";
  Events["MEDIA_DETACHING"] = "hlsMediaDetaching";
  Events["MEDIA_DETACHED"] = "hlsMediaDetached";
  Events["BUFFER_RESET"] = "hlsBufferReset";
  Events["BUFFER_CODECS"] = "hlsBufferCodecs";
  Events["BUFFER_CREATED"] = "hlsBufferCreated";
  Events["BUFFER_APPENDING"] = "hlsBufferAppending";
  Events["BUFFER_APPENDED"] = "hlsBufferAppended";
  Events["BUFFER_EOS"] = "hlsBufferEos";
  Events["BUFFER_FLUSHING"] = "hlsBufferFlushing";
  Events["BUFFER_FLUSHED"] = "hlsBufferFlushed";
  Events["MANIFEST_LOADING"] = "hlsManifestLoading";
  Events["MANIFEST_LOADED"] = "hlsManifestLoaded";
  Events["MANIFEST_PARSED"] = "hlsManifestParsed";
  Events["LEVEL_SWITCHING"] = "hlsLevelSwitching";
  Events["LEVEL_SWITCHED"] = "hlsLevelSwitched";
  Events["LEVEL_LOADING"] = "hlsLevelLoading";
  Events["LEVEL_LOADED"] = "hlsLevelLoaded";
  Events["LEVEL_UPDATED"] = "hlsLevelUpdated";
  Events["LEVEL_PTS_UPDATED"] = "hlsLevelPtsUpdated";
  Events["LEVELS_UPDATED"] = "hlsLevelsUpdated";
  Events["AUDIO_TRACKS_UPDATED"] = "hlsAudioTracksUpdated";
  Events["AUDIO_TRACK_SWITCHING"] = "hlsAudioTrackSwitching";
  Events["AUDIO_TRACK_SWITCHED"] = "hlsAudioTrackSwitched";
  Events["AUDIO_TRACK_LOADING"] = "hlsAudioTrackLoading";
  Events["AUDIO_TRACK_LOADED"] = "hlsAudioTrackLoaded";
  Events["SUBTITLE_TRACKS_UPDATED"] = "hlsSubtitleTracksUpdated";
  Events["SUBTITLE_TRACKS_CLEARED"] = "hlsSubtitleTracksCleared";
  Events["SUBTITLE_TRACK_SWITCH"] = "hlsSubtitleTrackSwitch";
  Events["SUBTITLE_TRACK_LOADING"] = "hlsSubtitleTrackLoading";
  Events["SUBTITLE_TRACK_LOADED"] = "hlsSubtitleTrackLoaded";
  Events["SUBTITLE_FRAG_PROCESSED"] = "hlsSubtitleFragProcessed";
  Events["CUES_PARSED"] = "hlsCuesParsed";
  Events["NON_NATIVE_TEXT_TRACKS_FOUND"] = "hlsNonNativeTextTracksFound";
  Events["INIT_PTS_FOUND"] = "hlsInitPtsFound";
  Events["FRAG_LOADING"] = "hlsFragLoading";
  Events["FRAG_LOAD_EMERGENCY_ABORTED"] = "hlsFragLoadEmergencyAborted";
  Events["FRAG_LOADED"] = "hlsFragLoaded";
  Events["FRAG_DECRYPTED"] = "hlsFragDecrypted";
  Events["FRAG_PARSING_INIT_SEGMENT"] = "hlsFragParsingInitSegment";
  Events["FRAG_PARSING_USERDATA"] = "hlsFragParsingUserdata";
  Events["FRAG_PARSING_METADATA"] = "hlsFragParsingMetadata";
  Events["FRAG_PARSED"] = "hlsFragParsed";
  Events["FRAG_BUFFERED"] = "hlsFragBuffered";
  Events["FRAG_CHANGED"] = "hlsFragChanged";
  Events["FPS_DROP"] = "hlsFpsDrop";
  Events["FPS_DROP_LEVEL_CAPPING"] = "hlsFpsDropLevelCapping";
  Events["ERROR"] = "hlsError";
  Events["DESTROYING"] = "hlsDestroying";
  Events["KEY_LOADING"] = "hlsKeyLoading";
  Events["KEY_LOADED"] = "hlsKeyLoaded";
  Events["LIVE_BACK_BUFFER_REACHED"] = "hlsLiveBackBufferReached";
  Events["BACK_BUFFER_REACHED"] = "hlsBackBufferReached";
  return Events;
}({});

/**
 * Defines each Event type and payload by Event name. Used in {@link hls.js#HlsEventEmitter} to strongly type the event listener API.
 */

let ErrorTypes = /*#__PURE__*/function (ErrorTypes) {
  ErrorTypes["NETWORK_ERROR"] = "networkError";
  ErrorTypes["MEDIA_ERROR"] = "mediaError";
  ErrorTypes["KEY_SYSTEM_ERROR"] = "keySystemError";
  ErrorTypes["MUX_ERROR"] = "muxError";
  ErrorTypes["OTHER_ERROR"] = "otherError";
  return ErrorTypes;
}({});
let ErrorDetails = /*#__PURE__*/function (ErrorDetails) {
  ErrorDetails["KEY_SYSTEM_NO_KEYS"] = "keySystemNoKeys";
  ErrorDetails["KEY_SYSTEM_NO_ACCESS"] = "keySystemNoAccess";
  ErrorDetails["KEY_SYSTEM_NO_SESSION"] = "keySystemNoSession";
  ErrorDetails["KEY_SYSTEM_NO_CONFIGURED_LICENSE"] = "keySystemNoConfiguredLicense";
  ErrorDetails["KEY_SYSTEM_LICENSE_REQUEST_FAILED"] = "keySystemLicenseRequestFailed";
  ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED"] = "keySystemServerCertificateRequestFailed";
  ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED"] = "keySystemServerCertificateUpdateFailed";
  ErrorDetails["KEY_SYSTEM_SESSION_UPDATE_FAILED"] = "keySystemSessionUpdateFailed";
  ErrorDetails["KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED"] = "keySystemStatusOutputRestricted";
  ErrorDetails["KEY_SYSTEM_STATUS_INTERNAL_ERROR"] = "keySystemStatusInternalError";
  ErrorDetails["MANIFEST_LOAD_ERROR"] = "manifestLoadError";
  ErrorDetails["MANIFEST_LOAD_TIMEOUT"] = "manifestLoadTimeOut";
  ErrorDetails["MANIFEST_PARSING_ERROR"] = "manifestParsingError";
  ErrorDetails["MANIFEST_INCOMPATIBLE_CODECS_ERROR"] = "manifestIncompatibleCodecsError";
  ErrorDetails["LEVEL_EMPTY_ERROR"] = "levelEmptyError";
  ErrorDetails["LEVEL_LOAD_ERROR"] = "levelLoadError";
  ErrorDetails["LEVEL_LOAD_TIMEOUT"] = "levelLoadTimeOut";
  ErrorDetails["LEVEL_PARSING_ERROR"] = "levelParsingError";
  ErrorDetails["LEVEL_SWITCH_ERROR"] = "levelSwitchError";
  ErrorDetails["AUDIO_TRACK_LOAD_ERROR"] = "audioTrackLoadError";
  ErrorDetails["AUDIO_TRACK_LOAD_TIMEOUT"] = "audioTrackLoadTimeOut";
  ErrorDetails["SUBTITLE_LOAD_ERROR"] = "subtitleTrackLoadError";
  ErrorDetails["SUBTITLE_TRACK_LOAD_TIMEOUT"] = "subtitleTrackLoadTimeOut";
  ErrorDetails["FRAG_LOAD_ERROR"] = "fragLoadError";
  ErrorDetails["FRAG_LOAD_TIMEOUT"] = "fragLoadTimeOut";
  ErrorDetails["FRAG_DECRYPT_ERROR"] = "fragDecryptError";
  ErrorDetails["FRAG_PARSING_ERROR"] = "fragParsingError";
  ErrorDetails["FRAG_GAP"] = "fragGap";
  ErrorDetails["REMUX_ALLOC_ERROR"] = "remuxAllocError";
  ErrorDetails["KEY_LOAD_ERROR"] = "keyLoadError";
  ErrorDetails["KEY_LOAD_TIMEOUT"] = "keyLoadTimeOut";
  ErrorDetails["BUFFER_ADD_CODEC_ERROR"] = "bufferAddCodecError";
  ErrorDetails["BUFFER_INCOMPATIBLE_CODECS_ERROR"] = "bufferIncompatibleCodecsError";
  ErrorDetails["BUFFER_APPEND_ERROR"] = "bufferAppendError";
  ErrorDetails["BUFFER_APPENDING_ERROR"] = "bufferAppendingError";
  ErrorDetails["BUFFER_STALLED_ERROR"] = "bufferStalledError";
  ErrorDetails["BUFFER_FULL_ERROR"] = "bufferFullError";
  ErrorDetails["BUFFER_SEEK_OVER_HOLE"] = "bufferSeekOverHole";
  ErrorDetails["BUFFER_NUDGE_ON_STALL"] = "bufferNudgeOnStall";
  ErrorDetails["INTERNAL_EXCEPTION"] = "internalException";
  ErrorDetails["INTERNAL_ABORTED"] = "aborted";
  ErrorDetails["UNKNOWN"] = "unknown";
  return ErrorDetails;
}({});

const noop = function noop() {};
const fakeLogger = {
  trace: noop,
  debug: noop,
  log: noop,
  warn: noop,
  info: noop,
  error: noop
};
let exportedLogger = fakeLogger;

// let lastCallTime;
// function formatMsgWithTimeInfo(type, msg) {
//   const now = Date.now();
//   const diff = lastCallTime ? '+' + (now - lastCallTime) : '0';
//   lastCallTime = now;
//   msg = (new Date(now)).toISOString() + ' | [' +  type + '] > ' + msg + ' ( ' + diff + ' ms )';
//   return msg;
// }

function consolePrintFn(type) {
  const func = self.console[type];
  if (func) {
    return func.bind(self.console, `[${type}] >`);
  }
  return noop;
}
function exportLoggerFunctions(debugConfig, ...functions) {
  functions.forEach(function (type) {
    exportedLogger[type] = debugConfig[type] ? debugConfig[type].bind(debugConfig) : consolePrintFn(type);
  });
}
function enableLogs(debugConfig, id) {
  // check that console is available
  if (self.console && debugConfig === true || typeof debugConfig === 'object') {
    exportLoggerFunctions(debugConfig,
    // Remove out from list here to hard-disable a log-level
    // 'trace',
    'debug', 'log', 'info', 'warn', 'error');
    // Some browsers don't allow to use bind on console object anyway
    // fallback to default if needed
    try {
      exportedLogger.log(`Debug logs enabled for "${id}" in hls.js version ${"1.4.13"}`);
    } catch (e) {
      exportedLogger = fakeLogger;
    }
  } else {
    exportedLogger = fakeLogger;
  }
}
const logger = exportedLogger;

const DECIMAL_RESOLUTION_REGEX = /^(\d+)x(\d+)$/;
const ATTR_LIST_REGEX = /(.+?)=(".*?"|.*?)(?:,|$)/g;

// adapted from https://github.com/kanongil/node-m3u8parse/blob/master/attrlist.js
class AttrList {
  constructor(attrs) {
    if (typeof attrs === 'string') {
      attrs = AttrList.parseAttrList(attrs);
    }
    for (const attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        if (attr.substring(0, 2) === 'X-') {
          this.clientAttrs = this.clientAttrs || [];
          this.clientAttrs.push(attr);
        }
        this[attr] = attrs[attr];
      }
    }
  }
  decimalInteger(attrName) {
    const intValue = parseInt(this[attrName], 10);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }
    return intValue;
  }
  hexadecimalInteger(attrName) {
    if (this[attrName]) {
      let stringValue = (this[attrName] || '0x').slice(2);
      stringValue = (stringValue.length & 1 ? '0' : '') + stringValue;
      const value = new Uint8Array(stringValue.length / 2);
      for (let i = 0; i < stringValue.length / 2; i++) {
        value[i] = parseInt(stringValue.slice(i * 2, i * 2 + 2), 16);
      }
      return value;
    } else {
      return null;
    }
  }
  hexadecimalIntegerAsNumber(attrName) {
    const intValue = parseInt(this[attrName], 16);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }
    return intValue;
  }
  decimalFloatingPoint(attrName) {
    return parseFloat(this[attrName]);
  }
  optionalFloat(attrName, defaultValue) {
    const value = this[attrName];
    return value ? parseFloat(value) : defaultValue;
  }
  enumeratedString(attrName) {
    return this[attrName];
  }
  bool(attrName) {
    return this[attrName] === 'YES';
  }
  decimalResolution(attrName) {
    const res = DECIMAL_RESOLUTION_REGEX.exec(this[attrName]);
    if (res === null) {
      return undefined;
    }
    return {
      width: parseInt(res[1], 10),
      height: parseInt(res[2], 10)
    };
  }
  static parseAttrList(input) {
    let match;
    const attrs = {};
    const quote = '"';
    ATTR_LIST_REGEX.lastIndex = 0;
    while ((match = ATTR_LIST_REGEX.exec(input)) !== null) {
      let value = match[2];
      if (value.indexOf(quote) === 0 && value.lastIndexOf(quote) === value.length - 1) {
        value = value.slice(1, -1);
      }
      const name = match[1].trim();
      attrs[name] = value;
    }
    return attrs;
  }
}

// Avoid exporting const enum so that these values can be inlined

function isDateRangeCueAttribute(attrName) {
  return attrName !== "ID" && attrName !== "CLASS" && attrName !== "START-DATE" && attrName !== "DURATION" && attrName !== "END-DATE" && attrName !== "END-ON-NEXT";
}
function isSCTE35Attribute(attrName) {
  return attrName === "SCTE35-OUT" || attrName === "SCTE35-IN";
}
class DateRange {
  constructor(dateRangeAttr, dateRangeWithSameId) {
    this.attr = void 0;
    this._startDate = void 0;
    this._endDate = void 0;
    this._badValueForSameId = void 0;
    if (dateRangeWithSameId) {
      const previousAttr = dateRangeWithSameId.attr;
      for (const key in previousAttr) {
        if (Object.prototype.hasOwnProperty.call(dateRangeAttr, key) && dateRangeAttr[key] !== previousAttr[key]) {
          logger.warn(`DATERANGE tag attribute: "${key}" does not match for tags with ID: "${dateRangeAttr.ID}"`);
          this._badValueForSameId = key;
          break;
        }
      }
      // Merge DateRange tags with the same ID
      dateRangeAttr = _extends(new AttrList({}), previousAttr, dateRangeAttr);
    }
    this.attr = dateRangeAttr;
    this._startDate = new Date(dateRangeAttr["START-DATE"]);
    if ("END-DATE" in this.attr) {
      const endDate = new Date(this.attr["END-DATE"]);
      if (isFiniteNumber(endDate.getTime())) {
        this._endDate = endDate;
      }
    }
  }
  get id() {
    return this.attr.ID;
  }
  get class() {
    return this.attr.CLASS;
  }
  get startDate() {
    return this._startDate;
  }
  get endDate() {
    if (this._endDate) {
      return this._endDate;
    }
    const duration = this.duration;
    if (duration !== null) {
      return new Date(this._startDate.getTime() + duration * 1000);
    }
    return null;
  }
  get duration() {
    if ("DURATION" in this.attr) {
      const duration = this.attr.decimalFloatingPoint("DURATION");
      if (isFiniteNumber(duration)) {
        return duration;
      }
    } else if (this._endDate) {
      return (this._endDate.getTime() - this._startDate.getTime()) / 1000;
    }
    return null;
  }
  get plannedDuration() {
    if ("PLANNED-DURATION" in this.attr) {
      return this.attr.decimalFloatingPoint("PLANNED-DURATION");
    }
    return null;
  }
  get endOnNext() {
    return this.attr.bool("END-ON-NEXT");
  }
  get isValid() {
    return !!this.id && !this._badValueForSameId && isFiniteNumber(this.startDate.getTime()) && (this.duration === null || this.duration >= 0) && (!this.endOnNext || !!this.class);
  }
}

class LoadStats {
  constructor() {
    this.aborted = false;
    this.loaded = 0;
    this.retry = 0;
    this.total = 0;
    this.chunkCount = 0;
    this.bwEstimate = 0;
    this.loading = {
      start: 0,
      first: 0,
      end: 0
    };
    this.parsing = {
      start: 0,
      end: 0
    };
    this.buffering = {
      start: 0,
      first: 0,
      end: 0
    };
  }
}

var ElementaryStreamTypes = {
  AUDIO: "audio",
  VIDEO: "video",
  AUDIOVIDEO: "audiovideo"
};
class BaseSegment {
  // baseurl is the URL to the playlist

  // relurl is the portion of the URL that comes from inside the playlist.

  // Holds the types of data this fragment supports

  constructor(baseurl) {
    this._byteRange = null;
    this._url = null;
    this.baseurl = void 0;
    this.relurl = void 0;
    this.elementaryStreams = {
      [ElementaryStreamTypes.AUDIO]: null,
      [ElementaryStreamTypes.VIDEO]: null,
      [ElementaryStreamTypes.AUDIOVIDEO]: null
    };
    this.baseurl = baseurl;
  }

  // setByteRange converts a EXT-X-BYTERANGE attribute into a two element array
  setByteRange(value, previous) {
    const params = value.split('@', 2);
    const byteRange = [];
    if (params.length === 1) {
      byteRange[0] = previous ? previous.byteRangeEndOffset : 0;
    } else {
      byteRange[0] = parseInt(params[1]);
    }
    byteRange[1] = parseInt(params[0]) + byteRange[0];
    this._byteRange = byteRange;
  }
  get byteRange() {
    if (!this._byteRange) {
      return [];
    }
    return this._byteRange;
  }
  get byteRangeStartOffset() {
    return this.byteRange[0];
  }
  get byteRangeEndOffset() {
    return this.byteRange[1];
  }
  get url() {
    if (!this._url && this.baseurl && this.relurl) {
      this._url = urlToolkitExports.buildAbsoluteURL(this.baseurl, this.relurl, {
        alwaysNormalize: true
      });
    }
    return this._url || '';
  }
  set url(value) {
    this._url = value;
  }
}

/**
 * Object representing parsed data from an HLS Segment. Found in {@link hls.js#LevelDetails.fragments}.
 */
class Fragment extends BaseSegment {
  // EXTINF has to be present for a m3u8 to be considered valid

  // sn notates the sequence number for a segment, and if set to a string can be 'initSegment'

  // levelkeys are the EXT-X-KEY tags that apply to this segment for decryption
  // core difference from the private field _decryptdata is the lack of the initialized IV
  // _decryptdata will set the IV for this segment based on the segment number in the fragment
  // A string representing the fragment type
  // A reference to the loader. Set while the fragment is loading, and removed afterwards. Used to abort fragment loading
  // A reference to the key loader. Set while the key is loading, and removed afterwards. Used to abort key loading
  // The level/track index to which the fragment belongs
  // The continuity counter of the fragment
  // The starting Presentation Time Stamp (PTS) of the fragment. Set after transmux complete.
  // The ending Presentation Time Stamp (PTS) of the fragment. Set after transmux complete.
  // The starting Decode Time Stamp (DTS) of the fragment. Set after transmux complete.
  // The ending Decode Time Stamp (DTS) of the fragment. Set after transmux complete.
  // The start time of the fragment, as listed in the manifest. Updated after transmux complete.
  // Set by `updateFragPTSDTS` in level-helper
  // The maximum starting Presentation Time Stamp (audio/video PTS) of the fragment. Set after transmux complete.
  // The minimum ending Presentation Time Stamp (audio/video PTS) of the fragment. Set after transmux complete.
  // Load/parse timing information
  // A flag indicating whether the segment was downloaded in order to test bitrate, and was not buffered
  // #EXTINF  segment title
  // The Media Initialization Section for this segment
  // Fragment is the last fragment in the media playlist
  // Fragment is marked by an EXT-X-GAP tag indicating that it does not contain media data and should not be loaded
  constructor(type, baseurl) {
    super(baseurl);
    this._decryptdata = null;
    this.rawProgramDateTime = null;
    this.programDateTime = null;
    this.tagList = [];
    this.duration = 0;
    this.sn = 0;
    this.levelkeys = void 0;
    this.type = void 0;
    this.loader = null;
    this.keyLoader = null;
    this.level = -1;
    this.cc = 0;
    this.startPTS = void 0;
    this.endPTS = void 0;
    this.startDTS = void 0;
    this.endDTS = void 0;
    this.start = 0;
    this.deltaPTS = void 0;
    this.maxStartPTS = void 0;
    this.minEndPTS = void 0;
    this.stats = new LoadStats();
    this.urlId = 0;
    this.data = void 0;
    this.bitrateTest = false;
    this.title = null;
    this.initSegment = null;
    this.endList = void 0;
    this.gap = void 0;
    this.type = type;
  }
  get decryptdata() {
    const {
      levelkeys
    } = this;
    if (!levelkeys && !this._decryptdata) {
      return null;
    }
    if (!this._decryptdata && this.levelkeys && !this.levelkeys.NONE) {
      const key = this.levelkeys.identity;
      if (key) {
        this._decryptdata = key.getDecryptData(this.sn);
      } else {
        const keyFormats = Object.keys(this.levelkeys);
        if (keyFormats.length === 1) {
          return this._decryptdata = this.levelkeys[keyFormats[0]].getDecryptData(this.sn);
        }
      }
    }
    return this._decryptdata;
  }
  get end() {
    return this.start + this.duration;
  }
  get endProgramDateTime() {
    if (this.programDateTime === null) {
      return null;
    }
    if (!isFiniteNumber(this.programDateTime)) {
      return null;
    }
    const duration = !isFiniteNumber(this.duration) ? 0 : this.duration;
    return this.programDateTime + duration * 1000;
  }
  get encrypted() {
    var _this$_decryptdata;
    // At the m3u8-parser level we need to add support for manifest signalled keyformats
    // when we want the fragment to start reporting that it is encrypted.
    // Currently, keyFormat will only be set for identity keys
    if ((_this$_decryptdata = this._decryptdata) != null && _this$_decryptdata.encrypted) {
      return true;
    } else if (this.levelkeys) {
      const keyFormats = Object.keys(this.levelkeys);
      const len = keyFormats.length;
      if (len > 1 || len === 1 && this.levelkeys[keyFormats[0]].encrypted) {
        return true;
      }
    }
    return false;
  }
  setKeyFormat(keyFormat) {
    if (this.levelkeys) {
      const key = this.levelkeys[keyFormat];
      if (key && !this._decryptdata) {
        this._decryptdata = key.getDecryptData(this.sn);
      }
    }
  }
  abortRequests() {
    var _this$loader, _this$keyLoader;
    (_this$loader = this.loader) == null ? void 0 : _this$loader.abort();
    (_this$keyLoader = this.keyLoader) == null ? void 0 : _this$keyLoader.abort();
  }
  setElementaryStreamInfo(type, startPTS, endPTS, startDTS, endDTS, partial = false) {
    const {
      elementaryStreams
    } = this;
    const info = elementaryStreams[type];
    if (!info) {
      elementaryStreams[type] = {
        startPTS,
        endPTS,
        startDTS,
        endDTS,
        partial
      };
      return;
    }
    info.startPTS = Math.min(info.startPTS, startPTS);
    info.endPTS = Math.max(info.endPTS, endPTS);
    info.startDTS = Math.min(info.startDTS, startDTS);
    info.endDTS = Math.max(info.endDTS, endDTS);
  }
  clearElementaryStreamInfo() {
    const {
      elementaryStreams
    } = this;
    elementaryStreams[ElementaryStreamTypes.AUDIO] = null;
    elementaryStreams[ElementaryStreamTypes.VIDEO] = null;
    elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO] = null;
  }
}

/**
 * Object representing parsed data from an HLS Partial Segment. Found in {@link hls.js#LevelDetails.partList}.
 */
class Part extends BaseSegment {
  constructor(partAttrs, frag, baseurl, index, previous) {
    super(baseurl);
    this.fragOffset = 0;
    this.duration = 0;
    this.gap = false;
    this.independent = false;
    this.relurl = void 0;
    this.fragment = void 0;
    this.index = void 0;
    this.stats = new LoadStats();
    this.duration = partAttrs.decimalFloatingPoint('DURATION');
    this.gap = partAttrs.bool('GAP');
    this.independent = partAttrs.bool('INDEPENDENT');
    this.relurl = partAttrs.enumeratedString('URI');
    this.fragment = frag;
    this.index = index;
    const byteRange = partAttrs.enumeratedString('BYTERANGE');
    if (byteRange) {
      this.setByteRange(byteRange, previous);
    }
    if (previous) {
      this.fragOffset = previous.fragOffset + previous.duration;
    }
  }
  get start() {
    return this.fragment.start + this.fragOffset;
  }
  get end() {
    return this.start + this.duration;
  }
  get loaded() {
    const {
      elementaryStreams
    } = this;
    return !!(elementaryStreams.audio || elementaryStreams.video || elementaryStreams.audiovideo);
  }
}

const DEFAULT_TARGET_DURATION = 10;

/**
 * Object representing parsed data from an HLS Media Playlist. Found in {@link hls.js#Level.details}.
 */
class LevelDetails {
  // Manifest reload synchronization

  constructor(baseUrl) {
    this.PTSKnown = false;
    this.alignedSliding = false;
    this.averagetargetduration = void 0;
    this.endCC = 0;
    this.endSN = 0;
    this.fragments = void 0;
    this.fragmentHint = void 0;
    this.partList = null;
    this.dateRanges = void 0;
    this.live = true;
    this.ageHeader = 0;
    this.advancedDateTime = void 0;
    this.updated = true;
    this.advanced = true;
    this.availabilityDelay = void 0;
    this.misses = 0;
    this.startCC = 0;
    this.startSN = 0;
    this.startTimeOffset = null;
    this.targetduration = 0;
    this.totalduration = 0;
    this.type = null;
    this.url = void 0;
    this.m3u8 = '';
    this.version = null;
    this.canBlockReload = false;
    this.canSkipUntil = 0;
    this.canSkipDateRanges = false;
    this.skippedSegments = 0;
    this.recentlyRemovedDateranges = void 0;
    this.partHoldBack = 0;
    this.holdBack = 0;
    this.partTarget = 0;
    this.preloadHint = void 0;
    this.renditionReports = void 0;
    this.tuneInGoal = 0;
    this.deltaUpdateFailed = void 0;
    this.driftStartTime = 0;
    this.driftEndTime = 0;
    this.driftStart = 0;
    this.driftEnd = 0;
    this.encryptedFragments = void 0;
    this.playlistParsingError = null;
    this.variableList = null;
    this.hasVariableRefs = false;
    this.fragments = [];
    this.encryptedFragments = [];
    this.dateRanges = {};
    this.url = baseUrl;
  }
  reloaded(previous) {
    if (!previous) {
      this.advanced = true;
      this.updated = true;
      return;
    }
    const partSnDiff = this.lastPartSn - previous.lastPartSn;
    const partIndexDiff = this.lastPartIndex - previous.lastPartIndex;
    this.updated = this.endSN !== previous.endSN || !!partIndexDiff || !!partSnDiff || !this.live;
    this.advanced = this.endSN > previous.endSN || partSnDiff > 0 || partSnDiff === 0 && partIndexDiff > 0;
    if (this.updated || this.advanced) {
      this.misses = Math.floor(previous.misses * 0.6);
    } else {
      this.misses = previous.misses + 1;
    }
    this.availabilityDelay = previous.availabilityDelay;
  }
  get hasProgramDateTime() {
    if (this.fragments.length) {
      return isFiniteNumber(this.fragments[this.fragments.length - 1].programDateTime);
    }
    return false;
  }
  get levelTargetDuration() {
    return this.averagetargetduration || this.targetduration || DEFAULT_TARGET_DURATION;
  }
  get drift() {
    const runTime = this.driftEndTime - this.driftStartTime;
    if (runTime > 0) {
      const runDuration = this.driftEnd - this.driftStart;
      return runDuration * 1000 / runTime;
    }
    return 1;
  }
  get edge() {
    return this.partEnd || this.fragmentEnd;
  }
  get partEnd() {
    var _this$partList;
    if ((_this$partList = this.partList) != null && _this$partList.length) {
      return this.partList[this.partList.length - 1].end;
    }
    return this.fragmentEnd;
  }
  get fragmentEnd() {
    var _this$fragments;
    if ((_this$fragments = this.fragments) != null && _this$fragments.length) {
      return this.fragments[this.fragments.length - 1].end;
    }
    return 0;
  }
  get age() {
    if (this.advancedDateTime) {
      return Math.max(Date.now() - this.advancedDateTime, 0) / 1000;
    }
    return 0;
  }
  get lastPartIndex() {
    var _this$partList2;
    if ((_this$partList2 = this.partList) != null && _this$partList2.length) {
      return this.partList[this.partList.length - 1].index;
    }
    return -1;
  }
  get lastPartSn() {
    var _this$partList3;
    if ((_this$partList3 = this.partList) != null && _this$partList3.length) {
      return this.partList[this.partList.length - 1].fragment.sn;
    }
    return this.endSN;
  }
}

function base64Decode(base64encodedStr) {
  return Uint8Array.from(atob(base64encodedStr), c => c.charCodeAt(0));
}

function getKeyIdBytes(str) {
  const keyIdbytes = strToUtf8array(str).subarray(0, 16);
  const paddedkeyIdbytes = new Uint8Array(16);
  paddedkeyIdbytes.set(keyIdbytes, 16 - keyIdbytes.length);
  return paddedkeyIdbytes;
}
function changeEndianness(keyId) {
  const swap = function swap(array, from, to) {
    const cur = array[from];
    array[from] = array[to];
    array[to] = cur;
  };
  swap(keyId, 0, 3);
  swap(keyId, 1, 2);
  swap(keyId, 4, 5);
  swap(keyId, 6, 7);
}
function convertDataUriToArrayBytes(uri) {
  // data:[<media type][;attribute=value][;base64],<data>
  const colonsplit = uri.split(':');
  let keydata = null;
  if (colonsplit[0] === 'data' && colonsplit.length === 2) {
    const semicolonsplit = colonsplit[1].split(';');
    const commasplit = semicolonsplit[semicolonsplit.length - 1].split(',');
    if (commasplit.length === 2) {
      const isbase64 = commasplit[0] === 'base64';
      const data = commasplit[1];
      if (isbase64) {
        semicolonsplit.splice(-1, 1); // remove from processing
        keydata = base64Decode(data);
      } else {
        keydata = getKeyIdBytes(data);
      }
    }
  }
  return keydata;
}
function strToUtf8array(str) {
  return Uint8Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess
 */
var KeySystems = {
  CLEARKEY: "org.w3.clearkey",
  FAIRPLAY: "com.apple.fps",
  PLAYREADY: "com.microsoft.playready",
  WIDEVINE: "com.widevine.alpha"
};

// Playlist #EXT-X-KEY KEYFORMAT values
var KeySystemFormats = {
  CLEARKEY: "org.w3.clearkey",
  FAIRPLAY: "com.apple.streamingkeydelivery",
  PLAYREADY: "com.microsoft.playready",
  WIDEVINE: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"
};
function keySystemFormatToKeySystemDomain(format) {
  switch (format) {
    case KeySystemFormats.FAIRPLAY:
      return KeySystems.FAIRPLAY;
    case KeySystemFormats.PLAYREADY:
      return KeySystems.PLAYREADY;
    case KeySystemFormats.WIDEVINE:
      return KeySystems.WIDEVINE;
    case KeySystemFormats.CLEARKEY:
      return KeySystems.CLEARKEY;
  }
}

// System IDs for which we can extract a key ID from "encrypted" event PSSH
var KeySystemIds = {
  WIDEVINE: "edef8ba979d64acea3c827dcd51d21ed"
};
function keySystemIdToKeySystemDomain(systemId) {
  if (systemId === KeySystemIds.WIDEVINE) {
    return KeySystems.WIDEVINE;
    // } else if (systemId === KeySystemIds.PLAYREADY) {
    //   return KeySystems.PLAYREADY;
    // } else if (systemId === KeySystemIds.CENC || systemId === KeySystemIds.CLEARKEY) {
    //   return KeySystems.CLEARKEY;
  }
}

function keySystemDomainToKeySystemFormat(keySystem) {
  switch (keySystem) {
    case KeySystems.FAIRPLAY:
      return KeySystemFormats.FAIRPLAY;
    case KeySystems.PLAYREADY:
      return KeySystemFormats.PLAYREADY;
    case KeySystems.WIDEVINE:
      return KeySystemFormats.WIDEVINE;
    case KeySystems.CLEARKEY:
      return KeySystemFormats.CLEARKEY;
  }
}
function getKeySystemsForConfig(config) {
  const {
    drmSystems,
    widevineLicenseUrl
  } = config;
  const keySystemsToAttempt = drmSystems ? [KeySystems.FAIRPLAY, KeySystems.WIDEVINE, KeySystems.PLAYREADY, KeySystems.CLEARKEY].filter(keySystem => !!drmSystems[keySystem]) : [];
  if (!keySystemsToAttempt[KeySystems.WIDEVINE] && widevineLicenseUrl) {
    keySystemsToAttempt.push(KeySystems.WIDEVINE);
  }
  return keySystemsToAttempt;
}
const requestMediaKeySystemAccess = function () {
  if (typeof self !== 'undefined' && self.navigator && self.navigator.requestMediaKeySystemAccess) {
    return self.navigator.requestMediaKeySystemAccess.bind(self.navigator);
  } else {
    return null;
  }
}();

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaKeySystemConfiguration
 */
function getSupportedMediaKeySystemConfigurations(keySystem, audioCodecs, videoCodecs, drmSystemOptions) {
  let initDataTypes;
  switch (keySystem) {
    case KeySystems.FAIRPLAY:
      initDataTypes = ['cenc', 'sinf'];
      break;
    case KeySystems.WIDEVINE:
    case KeySystems.PLAYREADY:
      initDataTypes = ['cenc'];
      break;
    case KeySystems.CLEARKEY:
      initDataTypes = ['cenc', 'keyids'];
      break;
    default:
      throw new Error(`Unknown key-system: ${keySystem}`);
  }
  return createMediaKeySystemConfigurations(initDataTypes, audioCodecs, videoCodecs, drmSystemOptions);
}
function createMediaKeySystemConfigurations(initDataTypes, audioCodecs, videoCodecs, drmSystemOptions) {
  const baseConfig = {
    initDataTypes: initDataTypes,
    persistentState: drmSystemOptions.persistentState || 'not-allowed',
    distinctiveIdentifier: drmSystemOptions.distinctiveIdentifier || 'not-allowed',
    sessionTypes: drmSystemOptions.sessionTypes || [drmSystemOptions.sessionType || 'temporary'],
    audioCapabilities: audioCodecs.map(codec => ({
      contentType: `audio/mp4; codecs="${codec}"`,
      robustness: drmSystemOptions.audioRobustness || '',
      encryptionScheme: drmSystemOptions.audioEncryptionScheme || null
    })),
    videoCapabilities: videoCodecs.map(codec => ({
      contentType: `video/mp4; codecs="${codec}"`,
      robustness: drmSystemOptions.videoRobustness || '',
      encryptionScheme: drmSystemOptions.videoEncryptionScheme || null
    }))
  };
  return [baseConfig];
}

function sliceUint8(array, start, end) {
  // @ts-expect-error This polyfills IE11 usage of Uint8Array slice.
  // It always exists in the TypeScript definition so fails, but it fails at runtime on IE11.
  return Uint8Array.prototype.slice ? array.slice(start, end) : new Uint8Array(Array.prototype.slice.call(array, start, end));
}

// breaking up those two types in order to clarify what is happening in the decoding path.

/**
 * Returns true if an ID3 header can be found at offset in data
 * @param data - The data to search
 * @param offset - The offset at which to start searching
 */
const isHeader$2 = (data, offset) => {
  /*
   * http://id3.org/id3v2.3.0
   * [0]     = 'I'
   * [1]     = 'D'
   * [2]     = '3'
   * [3,4]   = {Version}
   * [5]     = {Flags}
   * [6-9]   = {ID3 Size}
   *
   * An ID3v2 tag can be detected with the following pattern:
   *  $49 44 33 yy yy xx zz zz zz zz
   * Where yy is less than $FF, xx is the 'flags' byte and zz is less than $80
   */
  if (offset + 10 <= data.length) {
    // look for 'ID3' identifier
    if (data[offset] === 0x49 && data[offset + 1] === 0x44 && data[offset + 2] === 0x33) {
      // check version is within range
      if (data[offset + 3] < 0xff && data[offset + 4] < 0xff) {
        // check size is within range
        if (data[offset + 6] < 0x80 && data[offset + 7] < 0x80 && data[offset + 8] < 0x80 && data[offset + 9] < 0x80) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Returns true if an ID3 footer can be found at offset in data
 * @param data - The data to search
 * @param offset - The offset at which to start searching
 */
const isFooter = (data, offset) => {
  /*
   * The footer is a copy of the header, but with a different identifier
   */
  if (offset + 10 <= data.length) {
    // look for '3DI' identifier
    if (data[offset] === 0x33 && data[offset + 1] === 0x44 && data[offset + 2] === 0x49) {
      // check version is within range
      if (data[offset + 3] < 0xff && data[offset + 4] < 0xff) {
        // check size is within range
        if (data[offset + 6] < 0x80 && data[offset + 7] < 0x80 && data[offset + 8] < 0x80 && data[offset + 9] < 0x80) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Returns any adjacent ID3 tags found in data starting at offset, as one block of data
 * @param data - The data to search in
 * @param offset - The offset at which to start searching
 * @returns the block of data containing any ID3 tags found
 * or *undefined* if no header is found at the starting offset
 */
const getID3Data = (data, offset) => {
  const front = offset;
  let length = 0;
  while (isHeader$2(data, offset)) {
    // ID3 header is 10 bytes
    length += 10;
    const size = readSize(data, offset + 6);
    length += size;
    if (isFooter(data, offset + 10)) {
      // ID3 footer is 10 bytes
      length += 10;
    }
    offset += length;
  }
  if (length > 0) {
    return data.subarray(front, front + length);
  }
  return undefined;
};
const readSize = (data, offset) => {
  let size = 0;
  size = (data[offset] & 0x7f) << 21;
  size |= (data[offset + 1] & 0x7f) << 14;
  size |= (data[offset + 2] & 0x7f) << 7;
  size |= data[offset + 3] & 0x7f;
  return size;
};
const canParse$2 = (data, offset) => {
  return isHeader$2(data, offset) && readSize(data, offset + 6) + 10 <= data.length - offset;
};

/**
 * Searches for the Elementary Stream timestamp found in the ID3 data chunk
 * @param data - Block of data containing one or more ID3 tags
 */
const getTimeStamp = data => {
  const frames = getID3Frames(data);
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (isTimeStampFrame(frame)) {
      return readTimeStamp(frame);
    }
  }
  return undefined;
};

/**
 * Returns true if the ID3 frame is an Elementary Stream timestamp frame
 */
const isTimeStampFrame = frame => {
  return frame && frame.key === 'PRIV' && frame.info === 'com.apple.streaming.transportStreamTimestamp';
};
const getFrameData = data => {
  /*
  Frame ID       $xx xx xx xx (four characters)
  Size           $xx xx xx xx
  Flags          $xx xx
  */
  const type = String.fromCharCode(data[0], data[1], data[2], data[3]);
  const size = readSize(data, 4);

  // skip frame id, size, and flags
  const offset = 10;
  return {
    type,
    size,
    data: data.subarray(offset, offset + size)
  };
};

/**
 * Returns an array of ID3 frames found in all the ID3 tags in the id3Data
 * @param id3Data - The ID3 data containing one or more ID3 tags
 */
const getID3Frames = id3Data => {
  let offset = 0;
  const frames = [];
  while (isHeader$2(id3Data, offset)) {
    const size = readSize(id3Data, offset + 6);
    // skip past ID3 header
    offset += 10;
    const end = offset + size;
    // loop through frames in the ID3 tag
    while (offset + 8 < end) {
      const frameData = getFrameData(id3Data.subarray(offset));
      const frame = decodeFrame(frameData);
      if (frame) {
        frames.push(frame);
      }

      // skip frame header and frame data
      offset += frameData.size + 10;
    }
    if (isFooter(id3Data, offset)) {
      offset += 10;
    }
  }
  return frames;
};
const decodeFrame = frame => {
  if (frame.type === 'PRIV') {
    return decodePrivFrame(frame);
  } else if (frame.type[0] === 'W') {
    return decodeURLFrame(frame);
  }
  return decodeTextFrame(frame);
};
const decodePrivFrame = frame => {
  /*
  Format: <text string>\0<binary data>
  */
  if (frame.size < 2) {
    return undefined;
  }
  const owner = utf8ArrayToStr(frame.data, true);
  const privateData = new Uint8Array(frame.data.subarray(owner.length + 1));
  return {
    key: frame.type,
    info: owner,
    data: privateData.buffer
  };
};
const decodeTextFrame = frame => {
  if (frame.size < 2) {
    return undefined;
  }
  if (frame.type === 'TXXX') {
    /*
    Format:
    [0]   = {Text Encoding}
    [1-?] = {Description}\0{Value}
    */
    let index = 1;
    const description = utf8ArrayToStr(frame.data.subarray(index), true);
    index += description.length + 1;
    const value = utf8ArrayToStr(frame.data.subarray(index));
    return {
      key: frame.type,
      info: description,
      data: value
    };
  }
  /*
  Format:
  [0]   = {Text Encoding}
  [1-?] = {Value}
  */
  const text = utf8ArrayToStr(frame.data.subarray(1));
  return {
    key: frame.type,
    data: text
  };
};
const decodeURLFrame = frame => {
  if (frame.type === 'WXXX') {
    /*
    Format:
    [0]   = {Text Encoding}
    [1-?] = {Description}\0{URL}
    */
    if (frame.size < 2) {
      return undefined;
    }
    let index = 1;
    const description = utf8ArrayToStr(frame.data.subarray(index), true);
    index += description.length + 1;
    const value = utf8ArrayToStr(frame.data.subarray(index));
    return {
      key: frame.type,
      info: description,
      data: value
    };
  }
  /*
  Format:
  [0-?] = {URL}
  */
  const url = utf8ArrayToStr(frame.data);
  return {
    key: frame.type,
    data: url
  };
};
const readTimeStamp = timeStampFrame => {
  if (timeStampFrame.data.byteLength === 8) {
    const data = new Uint8Array(timeStampFrame.data);
    // timestamp is 33 bit expressed as a big-endian eight-octet number,
    // with the upper 31 bits set to zero.
    const pts33Bit = data[3] & 0x1;
    let timestamp = (data[4] << 23) + (data[5] << 15) + (data[6] << 7) + data[7];
    timestamp /= 45;
    if (pts33Bit) {
      timestamp += 47721858.84;
    } // 2^32 / 90

    return Math.round(timestamp);
  }
  return undefined;
};

// http://stackoverflow.com/questions/8936984/uint8array-to-string-in-javascript/22373197
// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
const utf8ArrayToStr = (array, exitOnNull = false) => {
  const decoder = getTextDecoder();
  if (decoder) {
    const decoded = decoder.decode(array);
    if (exitOnNull) {
      // grab up to the first null
      const idx = decoded.indexOf('\0');
      return idx !== -1 ? decoded.substring(0, idx) : decoded;
    }

    // remove any null characters
    return decoded.replace(/\0/g, '');
  }
  const len = array.length;
  let c;
  let char2;
  let char3;
  let out = '';
  let i = 0;
  while (i < len) {
    c = array[i++];
    if (c === 0x00 && exitOnNull) {
      return out;
    } else if (c === 0x00 || c === 0x03) {
      // If the character is 3 (END_OF_TEXT) or 0 (NULL) then skip it
      continue;
    }
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode((c & 0x1f) << 6 | char2 & 0x3f);
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode((c & 0x0f) << 12 | (char2 & 0x3f) << 6 | (char3 & 0x3f) << 0);
        break;
    }
  }
  return out;
};
let decoder;
function getTextDecoder() {
  if (!decoder && typeof self.TextDecoder !== 'undefined') {
    decoder = new self.TextDecoder('utf-8');
  }
  return decoder;
}

/**
 *  hex dump helper class
 */

const Hex = {
  hexDump: function (array) {
    let str = '';
    for (let i = 0; i < array.length; i++) {
      let h = array[i].toString(16);
      if (h.length < 2) {
        h = '0' + h;
      }
      str += h;
    }
    return str;
  }
};

const UINT32_MAX$1 = Math.pow(2, 32) - 1;
const push = [].push;

// We are using fixed track IDs for driving the MP4 remuxer
// instead of following the TS PIDs.
// There is no reason not to do this and some browsers/SourceBuffer-demuxers
// may not like if there are TrackID "switches"
// See https://github.com/video-dev/hls.js/issues/1331
// Here we are mapping our internal track types to constant MP4 track IDs
// With MSE currently one can only have one track of each, and we are muxing
// whatever video/audio rendition in them.
const RemuxerTrackIdConfig = {
  video: 1,
  audio: 2,
  id3: 3,
  text: 4
};
function bin2str(data) {
  return String.fromCharCode.apply(null, data);
}
function readUint16(buffer, offset) {
  const val = buffer[offset] << 8 | buffer[offset + 1];
  return val < 0 ? 65536 + val : val;
}
function readUint32(buffer, offset) {
  const val = readSint32(buffer, offset);
  return val < 0 ? 4294967296 + val : val;
}
function readSint32(buffer, offset) {
  return buffer[offset] << 24 | buffer[offset + 1] << 16 | buffer[offset + 2] << 8 | buffer[offset + 3];
}
function writeUint32(buffer, offset, value) {
  buffer[offset] = value >> 24;
  buffer[offset + 1] = value >> 16 & 0xff;
  buffer[offset + 2] = value >> 8 & 0xff;
  buffer[offset + 3] = value & 0xff;
}

// Find the data for a box specified by its path
function findBox(data, path) {
  const results = [];
  if (!path.length) {
    // short-circuit the search for empty paths
    return results;
  }
  const end = data.byteLength;
  for (let i = 0; i < end;) {
    const size = readUint32(data, i);
    const type = bin2str(data.subarray(i + 4, i + 8));
    const endbox = size > 1 ? i + size : end;
    if (type === path[0]) {
      if (path.length === 1) {
        // this is the end of the path and we've found the box we were
        // looking for
        results.push(data.subarray(i + 8, endbox));
      } else {
        // recursively search for the next box along the path
        const subresults = findBox(data.subarray(i + 8, endbox), path.slice(1));
        if (subresults.length) {
          push.apply(results, subresults);
        }
      }
    }
    i = endbox;
  }

  // we've finished searching all of data
  return results;
}
function parseSegmentIndex(sidx) {
  const references = [];
  const version = sidx[0];

  // set initial offset, we skip the reference ID (not needed)
  let index = 8;
  const timescale = readUint32(sidx, index);
  index += 4;

  // TODO: parse earliestPresentationTime and firstOffset
  // usually zero in our case
  const earliestPresentationTime = 0;
  const firstOffset = 0;
  if (version === 0) {
    index += 8;
  } else {
    index += 16;
  }

  // skip reserved
  index += 2;
  let startByte = sidx.length + firstOffset;
  const referencesCount = readUint16(sidx, index);
  index += 2;
  for (let i = 0; i < referencesCount; i++) {
    let referenceIndex = index;
    const referenceInfo = readUint32(sidx, referenceIndex);
    referenceIndex += 4;
    const referenceSize = referenceInfo & 0x7fffffff;
    const referenceType = (referenceInfo & 0x80000000) >>> 31;
    if (referenceType === 1) {
      logger.warn('SIDX has hierarchical references (not supported)');
      return null;
    }
    const subsegmentDuration = readUint32(sidx, referenceIndex);
    referenceIndex += 4;
    references.push({
      referenceSize,
      subsegmentDuration,
      // unscaled
      info: {
        duration: subsegmentDuration / timescale,
        start: startByte,
        end: startByte + referenceSize - 1
      }
    });
    startByte += referenceSize;

    // Skipping 1 bit for |startsWithSap|, 3 bits for |sapType|, and 28 bits
    // for |sapDelta|.
    referenceIndex += 4;

    // skip to next ref
    index = referenceIndex;
  }
  return {
    earliestPresentationTime,
    timescale,
    version,
    referencesCount,
    references
  };
}

/**
 * Parses an MP4 initialization segment and extracts stream type and
 * timescale values for any declared tracks. Timescale values indicate the
 * number of clock ticks per second to assume for time-based values
 * elsewhere in the MP4.
 *
 * To determine the start time of an MP4, you need two pieces of
 * information: the timescale unit and the earliest base media decode
 * time. Multiple timescales can be specified within an MP4 but the
 * base media decode time is always expressed in the timescale from
 * the media header box for the track:
 * ```
 * moov > trak > mdia > mdhd.timescale
 * moov > trak > mdia > hdlr
 * ```
 * @param initSegment the bytes of the init segment
 * @returns a hash of track type to timescale values or null if
 * the init segment is malformed.
 */

function parseInitSegment(initSegment) {
  const result = [];
  const traks = findBox(initSegment, ['moov', 'trak']);
  for (let i = 0; i < traks.length; i++) {
    const trak = traks[i];
    const tkhd = findBox(trak, ['tkhd'])[0];
    if (tkhd) {
      let version = tkhd[0];
      let index = version === 0 ? 12 : 20;
      const trackId = readUint32(tkhd, index);
      const mdhd = findBox(trak, ['mdia', 'mdhd'])[0];
      if (mdhd) {
        version = mdhd[0];
        index = version === 0 ? 12 : 20;
        const timescale = readUint32(mdhd, index);
        const hdlr = findBox(trak, ['mdia', 'hdlr'])[0];
        if (hdlr) {
          const hdlrType = bin2str(hdlr.subarray(8, 12));
          const type = {
            soun: ElementaryStreamTypes.AUDIO,
            vide: ElementaryStreamTypes.VIDEO
          }[hdlrType];
          if (type) {
            // Parse codec details
            const stsd = findBox(trak, ['mdia', 'minf', 'stbl', 'stsd'])[0];
            let codec;
            if (stsd) {
              codec = bin2str(stsd.subarray(12, 16));
              // TODO: Parse codec details to be able to build MIME type.
              // stsd.start += 8;
              // const codecBox = findBox(stsd, [codec])[0];
              // if (codecBox) {
              //   TODO: Codec parsing support for avc1, mp4a, hevc, av01...
              // }
            }

            result[trackId] = {
              timescale,
              type
            };
            result[type] = {
              timescale,
              id: trackId,
              codec
            };
          }
        }
      }
    }
  }
  const trex = findBox(initSegment, ['moov', 'mvex', 'trex']);
  trex.forEach(trex => {
    const trackId = readUint32(trex, 4);
    const track = result[trackId];
    if (track) {
      track.default = {
        duration: readUint32(trex, 12),
        flags: readUint32(trex, 20)
      };
    }
  });
  return result;
}
function patchEncyptionData(initSegment, decryptdata) {
  if (!initSegment || !decryptdata) {
    return initSegment;
  }
  const keyId = decryptdata.keyId;
  if (keyId && decryptdata.isCommonEncryption) {
    const traks = findBox(initSegment, ['moov', 'trak']);
    traks.forEach(trak => {
      const stsd = findBox(trak, ['mdia', 'minf', 'stbl', 'stsd'])[0];

      // skip the sample entry count
      const sampleEntries = stsd.subarray(8);
      let encBoxes = findBox(sampleEntries, ['enca']);
      const isAudio = encBoxes.length > 0;
      if (!isAudio) {
        encBoxes = findBox(sampleEntries, ['encv']);
      }
      encBoxes.forEach(enc => {
        const encBoxChildren = isAudio ? enc.subarray(28) : enc.subarray(78);
        const sinfBoxes = findBox(encBoxChildren, ['sinf']);
        sinfBoxes.forEach(sinf => {
          const tenc = parseSinf(sinf);
          if (tenc) {
            // Look for default key id (keyID offset is always 8 within the tenc box):
            const tencKeyId = tenc.subarray(8, 24);
            if (!tencKeyId.some(b => b !== 0)) {
              logger.log(`[eme] Patching keyId in 'enc${isAudio ? 'a' : 'v'}>sinf>>tenc' box: ${Hex.hexDump(tencKeyId)} -> ${Hex.hexDump(keyId)}`);
              tenc.set(keyId, 8);
            }
          }
        });
      });
    });
  }
  return initSegment;
}
function parseSinf(sinf) {
  const schm = findBox(sinf, ['schm'])[0];
  if (schm) {
    const scheme = bin2str(schm.subarray(4, 8));
    if (scheme === 'cbcs' || scheme === 'cenc') {
      return findBox(sinf, ['schi', 'tenc'])[0];
    }
  }
  logger.error(`[eme] missing 'schm' box`);
  return null;
}

/**
 * Determine the base media decode start time, in seconds, for an MP4
 * fragment. If multiple fragments are specified, the earliest time is
 * returned.
 *
 * The base media decode time can be parsed from track fragment
 * metadata:
 * ```
 * moof > traf > tfdt.baseMediaDecodeTime
 * ```
 * It requires the timescale value from the mdhd to interpret.
 *
 * @param initData - a hash of track type to timescale values
 * @param fmp4 - the bytes of the mp4 fragment
 * @returns the earliest base media decode start time for the
 * fragment, in seconds
 */
function getStartDTS(initData, fmp4) {
  // we need info from two children of each track fragment box
  return findBox(fmp4, ['moof', 'traf']).reduce((result, traf) => {
    const tfdt = findBox(traf, ['tfdt'])[0];
    const version = tfdt[0];
    const start = findBox(traf, ['tfhd']).reduce((result, tfhd) => {
      // get the track id from the tfhd
      const id = readUint32(tfhd, 4);
      const track = initData[id];
      if (track) {
        let baseTime = readUint32(tfdt, 4);
        if (version === 1) {
          // If value is too large, assume signed 64-bit. Negative track fragment decode times are invalid, but they exist in the wild.
          // This prevents large values from being used for initPTS, which can cause playlist sync issues.
          // https://github.com/video-dev/hls.js/issues/5303
          if (baseTime === UINT32_MAX$1) {
            logger.warn(`[mp4-demuxer]: Ignoring assumed invalid signed 64-bit track fragment decode time`);
            return result;
          }
          baseTime *= UINT32_MAX$1 + 1;
          baseTime += readUint32(tfdt, 8);
        }
        // assume a 90kHz clock if no timescale was specified
        const scale = track.timescale || 90e3;
        // convert base time to seconds
        const startTime = baseTime / scale;
        if (isFiniteNumber(startTime) && (result === null || startTime < result)) {
          return startTime;
        }
      }
      return result;
    }, null);
    if (start !== null && isFiniteNumber(start) && (result === null || start < result)) {
      return start;
    }
    return result;
  }, null);
}

/*
  For Reference:
  aligned(8) class TrackFragmentHeaderBox
           extends FullBox(‘tfhd’, 0, tf_flags){
     unsigned int(32)  track_ID;
     // all the following are optional fields
     unsigned int(64)  base_data_offset;
     unsigned int(32)  sample_description_index;
     unsigned int(32)  default_sample_duration;
     unsigned int(32)  default_sample_size;
     unsigned int(32)  default_sample_flags
  }
 */
function getDuration(data, initData) {
  let rawDuration = 0;
  let videoDuration = 0;
  let audioDuration = 0;
  const trafs = findBox(data, ['moof', 'traf']);
  for (let i = 0; i < trafs.length; i++) {
    const traf = trafs[i];
    // There is only one tfhd & trun per traf
    // This is true for CMAF style content, and we should perhaps check the ftyp
    // and only look for a single trun then, but for ISOBMFF we should check
    // for multiple track runs.
    const tfhd = findBox(traf, ['tfhd'])[0];
    // get the track id from the tfhd
    const id = readUint32(tfhd, 4);
    const track = initData[id];
    if (!track) {
      continue;
    }
    const trackDefault = track.default;
    const tfhdFlags = readUint32(tfhd, 0) | (trackDefault == null ? void 0 : trackDefault.flags);
    let sampleDuration = trackDefault == null ? void 0 : trackDefault.duration;
    if (tfhdFlags & 0x000008) {
      // 0x000008 indicates the presence of the default_sample_duration field
      if (tfhdFlags & 0x000002) {
        // 0x000002 indicates the presence of the sample_description_index field, which precedes default_sample_duration
        // If present, the default_sample_duration exists at byte offset 12
        sampleDuration = readUint32(tfhd, 12);
      } else {
        // Otherwise, the duration is at byte offset 8
        sampleDuration = readUint32(tfhd, 8);
      }
    }
    // assume a 90kHz clock if no timescale was specified
    const timescale = track.timescale || 90e3;
    const truns = findBox(traf, ['trun']);
    for (let j = 0; j < truns.length; j++) {
      rawDuration = computeRawDurationFromSamples(truns[j]);
      if (!rawDuration && sampleDuration) {
        const sampleCount = readUint32(truns[j], 4);
        rawDuration = sampleDuration * sampleCount;
      }
      if (track.type === ElementaryStreamTypes.VIDEO) {
        videoDuration += rawDuration / timescale;
      } else if (track.type === ElementaryStreamTypes.AUDIO) {
        audioDuration += rawDuration / timescale;
      }
    }
  }
  if (videoDuration === 0 && audioDuration === 0) {
    // If duration samples are not available in the traf use sidx subsegment_duration
    let sidxDuration = 0;
    const sidxs = findBox(data, ['sidx']);
    for (let i = 0; i < sidxs.length; i++) {
      const sidx = parseSegmentIndex(sidxs[i]);
      if (sidx != null && sidx.references) {
        sidxDuration += sidx.references.reduce((dur, ref) => dur + ref.info.duration || 0, 0);
      }
    }
    return sidxDuration;
  }
  if (videoDuration) {
    return videoDuration;
  }
  return audioDuration;
}

/*
  For Reference:
  aligned(8) class TrackRunBox
           extends FullBox(‘trun’, version, tr_flags) {
     unsigned int(32)  sample_count;
     // the following are optional fields
     signed int(32) data_offset;
     unsigned int(32)  first_sample_flags;
     // all fields in the following array are optional
     {
        unsigned int(32)  sample_duration;
        unsigned int(32)  sample_size;
        unsigned int(32)  sample_flags
        if (version == 0)
           { unsigned int(32)
        else
           { signed int(32)
     }[ sample_count ]
  }
 */
function computeRawDurationFromSamples(trun) {
  const flags = readUint32(trun, 0);
  // Flags are at offset 0, non-optional sample_count is at offset 4. Therefore we start 8 bytes in.
  // Each field is an int32, which is 4 bytes
  let offset = 8;
  // data-offset-present flag
  if (flags & 0x000001) {
    offset += 4;
  }
  // first-sample-flags-present flag
  if (flags & 0x000004) {
    offset += 4;
  }
  let duration = 0;
  const sampleCount = readUint32(trun, 4);
  for (let i = 0; i < sampleCount; i++) {
    // sample-duration-present flag
    if (flags & 0x000100) {
      const sampleDuration = readUint32(trun, offset);
      duration += sampleDuration;
      offset += 4;
    }
    // sample-size-present flag
    if (flags & 0x000200) {
      offset += 4;
    }
    // sample-flags-present flag
    if (flags & 0x000400) {
      offset += 4;
    }
    // sample-composition-time-offsets-present flag
    if (flags & 0x000800) {
      offset += 4;
    }
  }
  return duration;
}
function offsetStartDTS(initData, fmp4, timeOffset) {
  findBox(fmp4, ['moof', 'traf']).forEach(traf => {
    findBox(traf, ['tfhd']).forEach(tfhd => {
      // get the track id from the tfhd
      const id = readUint32(tfhd, 4);
      const track = initData[id];
      if (!track) {
        return;
      }
      // assume a 90kHz clock if no timescale was specified
      const timescale = track.timescale || 90e3;
      // get the base media decode time from the tfdt
      findBox(traf, ['tfdt']).forEach(tfdt => {
        const version = tfdt[0];
        let baseMediaDecodeTime = readUint32(tfdt, 4);
        if (version === 0) {
          baseMediaDecodeTime -= timeOffset * timescale;
          baseMediaDecodeTime = Math.max(baseMediaDecodeTime, 0);
          writeUint32(tfdt, 4, baseMediaDecodeTime);
        } else {
          baseMediaDecodeTime *= Math.pow(2, 32);
          baseMediaDecodeTime += readUint32(tfdt, 8);
          baseMediaDecodeTime -= timeOffset * timescale;
          baseMediaDecodeTime = Math.max(baseMediaDecodeTime, 0);
          const upper = Math.floor(baseMediaDecodeTime / (UINT32_MAX$1 + 1));
          const lower = Math.floor(baseMediaDecodeTime % (UINT32_MAX$1 + 1));
          writeUint32(tfdt, 4, upper);
          writeUint32(tfdt, 8, lower);
        }
      });
    });
  });
}

// TODO: Check if the last moof+mdat pair is part of the valid range
function segmentValidRange(data) {
  const segmentedRange = {
    valid: null,
    remainder: null
  };
  const moofs = findBox(data, ['moof']);
  if (!moofs) {
    return segmentedRange;
  } else if (moofs.length < 2) {
    segmentedRange.remainder = data;
    return segmentedRange;
  }
  const last = moofs[moofs.length - 1];
  // Offset by 8 bytes; findBox offsets the start by as much
  segmentedRange.valid = sliceUint8(data, 0, last.byteOffset - 8);
  segmentedRange.remainder = sliceUint8(data, last.byteOffset - 8);
  return segmentedRange;
}
function appendUint8Array(data1, data2) {
  const temp = new Uint8Array(data1.length + data2.length);
  temp.set(data1);
  temp.set(data2, data1.length);
  return temp;
}
function parseSamples(timeOffset, track) {
  const seiSamples = [];
  const videoData = track.samples;
  const timescale = track.timescale;
  const trackId = track.id;
  let isHEVCFlavor = false;
  const moofs = findBox(videoData, ['moof']);
  moofs.map(moof => {
    const moofOffset = moof.byteOffset - 8;
    const trafs = findBox(moof, ['traf']);
    trafs.map(traf => {
      // get the base media decode time from the tfdt
      const baseTime = findBox(traf, ['tfdt']).map(tfdt => {
        const version = tfdt[0];
        let result = readUint32(tfdt, 4);
        if (version === 1) {
          result *= Math.pow(2, 32);
          result += readUint32(tfdt, 8);
        }
        return result / timescale;
      })[0];
      if (baseTime !== undefined) {
        timeOffset = baseTime;
      }
      return findBox(traf, ['tfhd']).map(tfhd => {
        const id = readUint32(tfhd, 4);
        const tfhdFlags = readUint32(tfhd, 0) & 0xffffff;
        const baseDataOffsetPresent = (tfhdFlags & 0x000001) !== 0;
        const sampleDescriptionIndexPresent = (tfhdFlags & 0x000002) !== 0;
        const defaultSampleDurationPresent = (tfhdFlags & 0x000008) !== 0;
        let defaultSampleDuration = 0;
        const defaultSampleSizePresent = (tfhdFlags & 0x000010) !== 0;
        let defaultSampleSize = 0;
        const defaultSampleFlagsPresent = (tfhdFlags & 0x000020) !== 0;
        let tfhdOffset = 8;
        if (id === trackId) {
          if (baseDataOffsetPresent) {
            tfhdOffset += 8;
          }
          if (sampleDescriptionIndexPresent) {
            tfhdOffset += 4;
          }
          if (defaultSampleDurationPresent) {
            defaultSampleDuration = readUint32(tfhd, tfhdOffset);
            tfhdOffset += 4;
          }
          if (defaultSampleSizePresent) {
            defaultSampleSize = readUint32(tfhd, tfhdOffset);
            tfhdOffset += 4;
          }
          if (defaultSampleFlagsPresent) {
            tfhdOffset += 4;
          }
          if (track.type === 'video') {
            isHEVCFlavor = isHEVC(track.codec);
          }
          findBox(traf, ['trun']).map(trun => {
            const version = trun[0];
            const flags = readUint32(trun, 0) & 0xffffff;
            const dataOffsetPresent = (flags & 0x000001) !== 0;
            let dataOffset = 0;
            const firstSampleFlagsPresent = (flags & 0x000004) !== 0;
            const sampleDurationPresent = (flags & 0x000100) !== 0;
            let sampleDuration = 0;
            const sampleSizePresent = (flags & 0x000200) !== 0;
            let sampleSize = 0;
            const sampleFlagsPresent = (flags & 0x000400) !== 0;
            const sampleCompositionOffsetsPresent = (flags & 0x000800) !== 0;
            let compositionOffset = 0;
            const sampleCount = readUint32(trun, 4);
            let trunOffset = 8; // past version, flags, and sample count

            if (dataOffsetPresent) {
              dataOffset = readUint32(trun, trunOffset);
              trunOffset += 4;
            }
            if (firstSampleFlagsPresent) {
              trunOffset += 4;
            }
            let sampleOffset = dataOffset + moofOffset;
            for (let ix = 0; ix < sampleCount; ix++) {
              if (sampleDurationPresent) {
                sampleDuration = readUint32(trun, trunOffset);
                trunOffset += 4;
              } else {
                sampleDuration = defaultSampleDuration;
              }
              if (sampleSizePresent) {
                sampleSize = readUint32(trun, trunOffset);
                trunOffset += 4;
              } else {
                sampleSize = defaultSampleSize;
              }
              if (sampleFlagsPresent) {
                trunOffset += 4;
              }
              if (sampleCompositionOffsetsPresent) {
                if (version === 0) {
                  compositionOffset = readUint32(trun, trunOffset);
                } else {
                  compositionOffset = readSint32(trun, trunOffset);
                }
                trunOffset += 4;
              }
              if (track.type === ElementaryStreamTypes.VIDEO) {
                let naluTotalSize = 0;
                while (naluTotalSize < sampleSize) {
                  const naluSize = readUint32(videoData, sampleOffset);
                  sampleOffset += 4;
                  if (isSEIMessage(isHEVCFlavor, videoData[sampleOffset])) {
                    const data = videoData.subarray(sampleOffset, sampleOffset + naluSize);
                    parseSEIMessageFromNALu(data, isHEVCFlavor ? 2 : 1, timeOffset + compositionOffset / timescale, seiSamples);
                  }
                  sampleOffset += naluSize;
                  naluTotalSize += naluSize + 4;
                }
              }
              timeOffset += sampleDuration / timescale;
            }
          });
        }
      });
    });
  });
  return seiSamples;
}
function isHEVC(codec) {
  if (!codec) {
    return false;
  }
  const delimit = codec.indexOf('.');
  const baseCodec = delimit < 0 ? codec : codec.substring(0, delimit);
  return baseCodec === 'hvc1' || baseCodec === 'hev1' ||
  // Dolby Vision
  baseCodec === 'dvh1' || baseCodec === 'dvhe';
}
function isSEIMessage(isHEVCFlavor, naluHeader) {
  if (isHEVCFlavor) {
    const naluType = naluHeader >> 1 & 0x3f;
    return naluType === 39 || naluType === 40;
  } else {
    const naluType = naluHeader & 0x1f;
    return naluType === 6;
  }
}
function parseSEIMessageFromNALu(unescapedData, headerSize, pts, samples) {
  const data = discardEPB(unescapedData);
  let seiPtr = 0;
  // skip nal header
  seiPtr += headerSize;
  let payloadType = 0;
  let payloadSize = 0;
  let endOfCaptions = false;
  let b = 0;
  while (seiPtr < data.length) {
    payloadType = 0;
    do {
      if (seiPtr >= data.length) {
        break;
      }
      b = data[seiPtr++];
      payloadType += b;
    } while (b === 0xff);

    // Parse payload size.
    payloadSize = 0;
    do {
      if (seiPtr >= data.length) {
        break;
      }
      b = data[seiPtr++];
      payloadSize += b;
    } while (b === 0xff);
    const leftOver = data.length - seiPtr;
    if (!endOfCaptions && payloadType === 4 && seiPtr < data.length) {
      endOfCaptions = true;
      const countryCode = data[seiPtr++];
      if (countryCode === 181) {
        const providerCode = readUint16(data, seiPtr);
        seiPtr += 2;
        if (providerCode === 49) {
          const userStructure = readUint32(data, seiPtr);
          seiPtr += 4;
          if (userStructure === 0x47413934) {
            const userDataType = data[seiPtr++];

            // Raw CEA-608 bytes wrapped in CEA-708 packet
            if (userDataType === 3) {
              const firstByte = data[seiPtr++];
              const totalCCs = 0x1f & firstByte;
              const enabled = 0x40 & firstByte;
              const totalBytes = enabled ? 2 + totalCCs * 3 : 0;
              const byteArray = new Uint8Array(totalBytes);
              if (enabled) {
                byteArray[0] = firstByte;
                for (let i = 1; i < totalBytes; i++) {
                  byteArray[i] = data[seiPtr++];
                }
              }
              samples.push({
                type: userDataType,
                payloadType,
                pts,
                bytes: byteArray
              });
            }
          }
        }
      }
    } else if (payloadType === 5 && payloadSize < leftOver) {
      endOfCaptions = true;
      if (payloadSize > 16) {
        const uuidStrArray = [];
        for (let i = 0; i < 16; i++) {
          const _b = data[seiPtr++].toString(16);
          uuidStrArray.push(_b.length == 1 ? '0' + _b : _b);
          if (i === 3 || i === 5 || i === 7 || i === 9) {
            uuidStrArray.push('-');
          }
        }
        const length = payloadSize - 16;
        const userDataBytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          userDataBytes[i] = data[seiPtr++];
        }
        samples.push({
          payloadType,
          pts,
          uuid: uuidStrArray.join(''),
          userData: utf8ArrayToStr(userDataBytes),
          userDataBytes
        });
      }
    } else if (payloadSize < leftOver) {
      seiPtr += payloadSize;
    } else if (payloadSize > leftOver) {
      break;
    }
  }
}

/**
 * remove Emulation Prevention bytes from a RBSP
 */
function discardEPB(data) {
  const length = data.byteLength;
  const EPBPositions = [];
  let i = 1;

  // Find all `Emulation Prevention Bytes`
  while (i < length - 2) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0x03) {
      EPBPositions.push(i + 2);
      i += 2;
    } else {
      i++;
    }
  }

  // If no Emulation Prevention Bytes were found just return the original
  // array
  if (EPBPositions.length === 0) {
    return data;
  }

  // Create a new array to hold the NAL unit data
  const newLength = length - EPBPositions.length;
  const newData = new Uint8Array(newLength);
  let sourceIndex = 0;
  for (i = 0; i < newLength; sourceIndex++, i++) {
    if (sourceIndex === EPBPositions[0]) {
      // Skip this byte
      sourceIndex++;
      // Remove this position index
      EPBPositions.shift();
    }
    newData[i] = data[sourceIndex];
  }
  return newData;
}
function parseEmsg(data) {
  const version = data[0];
  let schemeIdUri = '';
  let value = '';
  let timeScale = 0;
  let presentationTimeDelta = 0;
  let presentationTime = 0;
  let eventDuration = 0;
  let id = 0;
  let offset = 0;
  if (version === 0) {
    while (bin2str(data.subarray(offset, offset + 1)) !== '\0') {
      schemeIdUri += bin2str(data.subarray(offset, offset + 1));
      offset += 1;
    }
    schemeIdUri += bin2str(data.subarray(offset, offset + 1));
    offset += 1;
    while (bin2str(data.subarray(offset, offset + 1)) !== '\0') {
      value += bin2str(data.subarray(offset, offset + 1));
      offset += 1;
    }
    value += bin2str(data.subarray(offset, offset + 1));
    offset += 1;
    timeScale = readUint32(data, 12);
    presentationTimeDelta = readUint32(data, 16);
    eventDuration = readUint32(data, 20);
    id = readUint32(data, 24);
    offset = 28;
  } else if (version === 1) {
    offset += 4;
    timeScale = readUint32(data, offset);
    offset += 4;
    const leftPresentationTime = readUint32(data, offset);
    offset += 4;
    const rightPresentationTime = readUint32(data, offset);
    offset += 4;
    presentationTime = 2 ** 32 * leftPresentationTime + rightPresentationTime;
    if (!isSafeInteger(presentationTime)) {
      presentationTime = Number.MAX_SAFE_INTEGER;
      logger.warn('Presentation time exceeds safe integer limit and wrapped to max safe integer in parsing emsg box');
    }
    eventDuration = readUint32(data, offset);
    offset += 4;
    id = readUint32(data, offset);
    offset += 4;
    while (bin2str(data.subarray(offset, offset + 1)) !== '\0') {
      schemeIdUri += bin2str(data.subarray(offset, offset + 1));
      offset += 1;
    }
    schemeIdUri += bin2str(data.subarray(offset, offset + 1));
    offset += 1;
    while (bin2str(data.subarray(offset, offset + 1)) !== '\0') {
      value += bin2str(data.subarray(offset, offset + 1));
      offset += 1;
    }
    value += bin2str(data.subarray(offset, offset + 1));
    offset += 1;
  }
  const payload = data.subarray(offset, data.byteLength);
  return {
    schemeIdUri,
    value,
    timeScale,
    presentationTime,
    presentationTimeDelta,
    eventDuration,
    id,
    payload
  };
}
function mp4Box(type, ...payload) {
  const len = payload.length;
  let size = 8;
  let i = len;
  while (i--) {
    size += payload[i].byteLength;
  }
  const result = new Uint8Array(size);
  result[0] = size >> 24 & 0xff;
  result[1] = size >> 16 & 0xff;
  result[2] = size >> 8 & 0xff;
  result[3] = size & 0xff;
  result.set(type, 4);
  for (i = 0, size = 8; i < len; i++) {
    result.set(payload[i], size);
    size += payload[i].byteLength;
  }
  return result;
}
function mp4pssh(systemId, keyids, data) {
  if (systemId.byteLength !== 16) {
    throw new RangeError('Invalid system id');
  }
  let version;
  let kids;
  if (keyids) {
    version = 1;
    kids = new Uint8Array(keyids.length * 16);
    for (let ix = 0; ix < keyids.length; ix++) {
      const k = keyids[ix]; // uint8array
      if (k.byteLength !== 16) {
        throw new RangeError('Invalid key');
      }
      kids.set(k, ix * 16);
    }
  } else {
    version = 0;
    kids = new Uint8Array();
  }
  let kidCount;
  if (version > 0) {
    kidCount = new Uint8Array(4);
    if (keyids.length > 0) {
      new DataView(kidCount.buffer).setUint32(0, keyids.length, false);
    }
  } else {
    kidCount = new Uint8Array();
  }
  const dataSize = new Uint8Array(4);
  if (data && data.byteLength > 0) {
    new DataView(dataSize.buffer).setUint32(0, data.byteLength, false);
  }
  return mp4Box([112, 115, 115, 104], new Uint8Array([version, 0x00, 0x00, 0x00 // Flags
  ]), systemId,
  // 16 bytes
  kidCount, kids, dataSize, data || new Uint8Array());
}
function parsePssh(initData) {
  if (!(initData instanceof ArrayBuffer) || initData.byteLength < 32) {
    return null;
  }
  const result = {
    version: 0,
    systemId: '',
    kids: null,
    data: null
  };
  const view = new DataView(initData);
  const boxSize = view.getUint32(0);
  if (initData.byteLength !== boxSize && boxSize > 44) {
    return null;
  }
  const type = view.getUint32(4);
  if (type !== 0x70737368) {
    return null;
  }
  result.version = view.getUint32(8) >>> 24;
  if (result.version > 1) {
    return null;
  }
  result.systemId = Hex.hexDump(new Uint8Array(initData, 12, 16));
  const dataSizeOrKidCount = view.getUint32(28);
  if (result.version === 0) {
    if (boxSize - 32 < dataSizeOrKidCount) {
      return null;
    }
    result.data = new Uint8Array(initData, 32, dataSizeOrKidCount);
  } else if (result.version === 1) {
    result.kids = [];
    for (let i = 0; i < dataSizeOrKidCount; i++) {
      result.kids.push(new Uint8Array(initData, 32 + i * 16, 16));
    }
  }
  return result;
}

let keyUriToKeyIdMap = {};
class LevelKey {
  static clearKeyUriToKeyIdMap() {
    keyUriToKeyIdMap = {};
  }
  constructor(method, uri, format, formatversions = [1], iv = null) {
    this.uri = void 0;
    this.method = void 0;
    this.keyFormat = void 0;
    this.keyFormatVersions = void 0;
    this.encrypted = void 0;
    this.isCommonEncryption = void 0;
    this.iv = null;
    this.key = null;
    this.keyId = null;
    this.pssh = null;
    this.method = method;
    this.uri = uri;
    this.keyFormat = format;
    this.keyFormatVersions = formatversions;
    this.iv = iv;
    this.encrypted = method ? method !== 'NONE' : false;
    this.isCommonEncryption = this.encrypted && method !== 'AES-128';
  }
  isSupported() {
    // If it's Segment encryption or No encryption, just select that key system
    if (this.method) {
      if (this.method === 'AES-128' || this.method === 'NONE') {
        return true;
      }
      if (this.keyFormat === 'identity') {
        // Maintain support for clear SAMPLE-AES with MPEG-3 TS
        return this.method === 'SAMPLE-AES';
      } else {
        switch (this.keyFormat) {
          case KeySystemFormats.FAIRPLAY:
          case KeySystemFormats.WIDEVINE:
          case KeySystemFormats.PLAYREADY:
          case KeySystemFormats.CLEARKEY:
            return ['ISO-23001-7', 'SAMPLE-AES', 'SAMPLE-AES-CENC', 'SAMPLE-AES-CTR'].indexOf(this.method) !== -1;
        }
      }
    }
    return false;
  }
  getDecryptData(sn) {
    if (!this.encrypted || !this.uri) {
      return null;
    }
    if (this.method === 'AES-128' && this.uri && !this.iv) {
      if (typeof sn !== 'number') {
        // We are fetching decryption data for a initialization segment
        // If the segment was encrypted with AES-128
        // It must have an IV defined. We cannot substitute the Segment Number in.
        if (this.method === 'AES-128' && !this.iv) {
          logger.warn(`missing IV for initialization segment with method="${this.method}" - compliance issue`);
        }
        // Explicitly set sn to resulting value from implicit conversions 'initSegment' values for IV generation.
        sn = 0;
      }
      const iv = createInitializationVector(sn);
      const decryptdata = new LevelKey(this.method, this.uri, 'identity', this.keyFormatVersions, iv);
      return decryptdata;
    }

    // Initialize keyId if possible
    const keyBytes = convertDataUriToArrayBytes(this.uri);
    if (keyBytes) {
      switch (this.keyFormat) {
        case KeySystemFormats.WIDEVINE:
          this.pssh = keyBytes;
          // In case of widevine keyID is embedded in PSSH box. Read Key ID.
          if (keyBytes.length >= 22) {
            this.keyId = keyBytes.subarray(keyBytes.length - 22, keyBytes.length - 6);
          }
          break;
        case KeySystemFormats.PLAYREADY:
          {
            const PlayReadyKeySystemUUID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]);
            this.pssh = mp4pssh(PlayReadyKeySystemUUID, null, keyBytes);
            const keyBytesUtf16 = new Uint16Array(keyBytes.buffer, keyBytes.byteOffset, keyBytes.byteLength / 2);
            const keyByteStr = String.fromCharCode.apply(null, Array.from(keyBytesUtf16));

            // Parse Playready WRMHeader XML
            const xmlKeyBytes = keyByteStr.substring(keyByteStr.indexOf('<'), keyByteStr.length);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlKeyBytes, 'text/xml');
            const keyData = xmlDoc.getElementsByTagName('KID')[0];
            if (keyData) {
              const keyId = keyData.childNodes[0] ? keyData.childNodes[0].nodeValue : keyData.getAttribute('VALUE');
              if (keyId) {
                const keyIdArray = base64Decode(keyId).subarray(0, 16);
                // KID value in PRO is a base64-encoded little endian GUID interpretation of UUID
                // KID value in ‘tenc’ is a big endian UUID GUID interpretation of UUID
                changeEndianness(keyIdArray);
                this.keyId = keyIdArray;
              }
            }
            break;
          }
        default:
          {
            let keydata = keyBytes.subarray(0, 16);
            if (keydata.length !== 16) {
              const padded = new Uint8Array(16);
              padded.set(keydata, 16 - keydata.length);
              keydata = padded;
            }
            this.keyId = keydata;
            break;
          }
      }
    }

    // Default behavior: assign a new keyId for each uri
    if (!this.keyId || this.keyId.byteLength !== 16) {
      let keyId = keyUriToKeyIdMap[this.uri];
      if (!keyId) {
        const val = Object.keys(keyUriToKeyIdMap).length % Number.MAX_SAFE_INTEGER;
        keyId = new Uint8Array(16);
        const dv = new DataView(keyId.buffer, 12, 4); // Just set the last 4 bytes
        dv.setUint32(0, val);
        keyUriToKeyIdMap[this.uri] = keyId;
      }
      this.keyId = keyId;
    }
    return this;
  }
}
function createInitializationVector(segmentNumber) {
  const uint8View = new Uint8Array(16);
  for (let i = 12; i < 16; i++) {
    uint8View[i] = segmentNumber >> 8 * (15 - i) & 0xff;
  }
  return uint8View;
}

const VARIABLE_REPLACEMENT_REGEX = /\{\$([a-zA-Z0-9-_]+)\}/g;
function hasVariableReferences(str) {
  return VARIABLE_REPLACEMENT_REGEX.test(str);
}
function substituteVariablesInAttributes(parsed, attr, attributeNames) {
  if (parsed.variableList !== null || parsed.hasVariableRefs) {
    for (let i = attributeNames.length; i--;) {
      const name = attributeNames[i];
      const value = attr[name];
      if (value) {
        attr[name] = substituteVariables(parsed, value);
      }
    }
  }
}
function substituteVariables(parsed, value) {
  if (parsed.variableList !== null || parsed.hasVariableRefs) {
    const variableList = parsed.variableList;
    return value.replace(VARIABLE_REPLACEMENT_REGEX, variableReference => {
      const variableName = variableReference.substring(2, variableReference.length - 1);
      const variableValue = variableList == null ? void 0 : variableList[variableName];
      if (variableValue === undefined) {
        parsed.playlistParsingError || (parsed.playlistParsingError = new Error(`Missing preceding EXT-X-DEFINE tag for Variable Reference: "${variableName}"`));
        return variableReference;
      }
      return variableValue;
    });
  }
  return value;
}
function addVariableDefinition(parsed, attr, parentUrl) {
  let variableList = parsed.variableList;
  if (!variableList) {
    parsed.variableList = variableList = {};
  }
  let NAME;
  let VALUE;
  if ('QUERYPARAM' in attr) {
    NAME = attr.QUERYPARAM;
    try {
      const searchParams = new self.URL(parentUrl).searchParams;
      if (searchParams.has(NAME)) {
        VALUE = searchParams.get(NAME);
      } else {
        throw new Error(`"${NAME}" does not match any query parameter in URI: "${parentUrl}"`);
      }
    } catch (error) {
      parsed.playlistParsingError || (parsed.playlistParsingError = new Error(`EXT-X-DEFINE QUERYPARAM: ${error.message}`));
    }
  } else {
    NAME = attr.NAME;
    VALUE = attr.VALUE;
  }
  if (NAME in variableList) {
    parsed.playlistParsingError || (parsed.playlistParsingError = new Error(`EXT-X-DEFINE duplicate Variable Name declarations: "${NAME}"`));
  } else {
    variableList[NAME] = VALUE || '';
  }
}
function importVariableDefinition(parsed, attr, sourceVariableList) {
  const IMPORT = attr.IMPORT;
  if (sourceVariableList && IMPORT in sourceVariableList) {
    let variableList = parsed.variableList;
    if (!variableList) {
      parsed.variableList = variableList = {};
    }
    variableList[IMPORT] = sourceVariableList[IMPORT];
  } else {
    parsed.playlistParsingError || (parsed.playlistParsingError = new Error(`EXT-X-DEFINE IMPORT attribute not found in Multivariant Playlist: "${IMPORT}"`));
  }
}

/**
 * MediaSource helper
 */

function getMediaSource() {
  if (typeof self === 'undefined') return undefined;
  return self.MediaSource || self.WebKitMediaSource;
}

// from http://mp4ra.org/codecs.html
const sampleEntryCodesISO = {
  audio: {
    a3ds: true,
    'ac-3': true,
    'ac-4': true,
    alac: true,
    alaw: true,
    dra1: true,
    'dts+': true,
    'dts-': true,
    dtsc: true,
    dtse: true,
    dtsh: true,
    'ec-3': true,
    enca: true,
    g719: true,
    g726: true,
    m4ae: true,
    mha1: true,
    mha2: true,
    mhm1: true,
    mhm2: true,
    mlpa: true,
    mp4a: true,
    'raw ': true,
    Opus: true,
    opus: true,
    // browsers expect this to be lowercase despite MP4RA says 'Opus'
    samr: true,
    sawb: true,
    sawp: true,
    sevc: true,
    sqcp: true,
    ssmv: true,
    twos: true,
    ulaw: true
  },
  video: {
    avc1: true,
    avc2: true,
    avc3: true,
    avc4: true,
    avcp: true,
    av01: true,
    drac: true,
    dva1: true,
    dvav: true,
    dvh1: true,
    dvhe: true,
    encv: true,
    hev1: true,
    hvc1: true,
    mjp2: true,
    mp4v: true,
    mvc1: true,
    mvc2: true,
    mvc3: true,
    mvc4: true,
    resv: true,
    rv60: true,
    s263: true,
    svc1: true,
    svc2: true,
    'vc-1': true,
    vp08: true,
    vp09: true
  },
  text: {
    stpp: true,
    wvtt: true
  }
};
const MediaSource$2 = getMediaSource();
function isCodecType(codec, type) {
  const typeCodes = sampleEntryCodesISO[type];
  return !!typeCodes && typeCodes[codec.slice(0, 4)] === true;
}
function isCodecSupportedInMp4(codec, type) {
  var _MediaSource$isTypeSu;
  return (_MediaSource$isTypeSu = MediaSource$2 == null ? void 0 : MediaSource$2.isTypeSupported(`${type || 'video'}/mp4;codecs="${codec}"`)) != null ? _MediaSource$isTypeSu : false;
}

const MASTER_PLAYLIST_REGEX = /#EXT-X-STREAM-INF:([^\r\n]*)(?:[\r\n](?:#[^\r\n]*)?)*([^\r\n]+)|#EXT-X-(SESSION-DATA|SESSION-KEY|DEFINE|CONTENT-STEERING|START):([^\r\n]*)[\r\n]+/g;
const MASTER_PLAYLIST_MEDIA_REGEX = /#EXT-X-MEDIA:(.*)/g;
const IS_MEDIA_PLAYLIST = /^#EXT(?:INF|-X-TARGETDURATION):/m; // Handle empty Media Playlist (first EXTINF not signaled, but TARGETDURATION present)

const LEVEL_PLAYLIST_REGEX_FAST = new RegExp([/#EXTINF:\s*(\d*(?:\.\d+)?)(?:,(.*)\s+)?/.source,
// duration (#EXTINF:<duration>,<title>), group 1 => duration, group 2 => title
/(?!#) *(\S[\S ]*)/.source,
// segment URI, group 3 => the URI (note newline is not eaten)
/#EXT-X-BYTERANGE:*(.+)/.source,
// next segment's byterange, group 4 => range spec (x@y)
/#EXT-X-PROGRAM-DATE-TIME:(.+)/.source,
// next segment's program date/time group 5 => the datetime spec
/#.*/.source // All other non-segment oriented tags will match with all groups empty
].join('|'), 'g');
const LEVEL_PLAYLIST_REGEX_SLOW = new RegExp([/#(EXTM3U)/.source, /#EXT-X-(DATERANGE|DEFINE|KEY|MAP|PART|PART-INF|PLAYLIST-TYPE|PRELOAD-HINT|RENDITION-REPORT|SERVER-CONTROL|SKIP|START):(.+)/.source, /#EXT-X-(BITRATE|DISCONTINUITY-SEQUENCE|MEDIA-SEQUENCE|TARGETDURATION|VERSION): *(\d+)/.source, /#EXT-X-(DISCONTINUITY|ENDLIST|GAP)/.source, /(#)([^:]*):(.*)/.source, /(#)(.*)(?:.*)\r?\n?/.source].join('|'));
class M3U8Parser {
  static findGroup(groups, mediaGroupId) {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.id === mediaGroupId) {
        return group;
      }
    }
  }
  static convertAVC1ToAVCOTI(codec) {
    // Convert avc1 codec string from RFC-4281 to RFC-6381 for MediaSource.isTypeSupported
    const avcdata = codec.split('.');
    if (avcdata.length > 2) {
      let result = avcdata.shift() + '.';
      result += parseInt(avcdata.shift()).toString(16);
      result += ('000' + parseInt(avcdata.shift()).toString(16)).slice(-4);
      return result;
    }
    return codec;
  }
  static resolve(url, baseUrl) {
    return urlToolkitExports.buildAbsoluteURL(baseUrl, url, {
      alwaysNormalize: true
    });
  }
  static isMediaPlaylist(str) {
    return IS_MEDIA_PLAYLIST.test(str);
  }
  static parseMasterPlaylist(string, baseurl) {
    const hasVariableRefs = hasVariableReferences(string) ;
    const parsed = {
      contentSteering: null,
      levels: [],
      playlistParsingError: null,
      sessionData: null,
      sessionKeys: null,
      startTimeOffset: null,
      variableList: null,
      hasVariableRefs
    };
    const levelsWithKnownCodecs = [];
    MASTER_PLAYLIST_REGEX.lastIndex = 0;
    let result;
    while ((result = MASTER_PLAYLIST_REGEX.exec(string)) != null) {
      if (result[1]) {
        var _level$unknownCodecs;
        // '#EXT-X-STREAM-INF' is found, parse level tag  in group 1
        const attrs = new AttrList(result[1]);
        {
          substituteVariablesInAttributes(parsed, attrs, ['CODECS', 'SUPPLEMENTAL-CODECS', 'ALLOWED-CPC', 'PATHWAY-ID', 'STABLE-VARIANT-ID', 'AUDIO', 'VIDEO', 'SUBTITLES', 'CLOSED-CAPTIONS', 'NAME']);
        }
        const uri = substituteVariables(parsed, result[2]) ;
        const level = {
          attrs,
          bitrate: attrs.decimalInteger('AVERAGE-BANDWIDTH') || attrs.decimalInteger('BANDWIDTH'),
          name: attrs.NAME,
          url: M3U8Parser.resolve(uri, baseurl)
        };
        const resolution = attrs.decimalResolution('RESOLUTION');
        if (resolution) {
          level.width = resolution.width;
          level.height = resolution.height;
        }
        setCodecs((attrs.CODECS || '').split(/[ ,]+/).filter(c => c), level);
        if (level.videoCodec && level.videoCodec.indexOf('avc1') !== -1) {
          level.videoCodec = M3U8Parser.convertAVC1ToAVCOTI(level.videoCodec);
        }
        if (!((_level$unknownCodecs = level.unknownCodecs) != null && _level$unknownCodecs.length)) {
          levelsWithKnownCodecs.push(level);
        }
        parsed.levels.push(level);
      } else if (result[3]) {
        const tag = result[3];
        const attributes = result[4];
        switch (tag) {
          case 'SESSION-DATA':
            {
              // #EXT-X-SESSION-DATA
              const sessionAttrs = new AttrList(attributes);
              {
                substituteVariablesInAttributes(parsed, sessionAttrs, ['DATA-ID', 'LANGUAGE', 'VALUE', 'URI']);
              }
              const dataId = sessionAttrs['DATA-ID'];
              if (dataId) {
                if (parsed.sessionData === null) {
                  parsed.sessionData = {};
                }
                parsed.sessionData[dataId] = sessionAttrs;
              }
              break;
            }
          case 'SESSION-KEY':
            {
              // #EXT-X-SESSION-KEY
              const sessionKey = parseKey(attributes, baseurl, parsed);
              if (sessionKey.encrypted && sessionKey.isSupported()) {
                if (parsed.sessionKeys === null) {
                  parsed.sessionKeys = [];
                }
                parsed.sessionKeys.push(sessionKey);
              } else {
                logger.warn(`[Keys] Ignoring invalid EXT-X-SESSION-KEY tag: "${attributes}"`);
              }
              break;
            }
          case 'DEFINE':
            {
              // #EXT-X-DEFINE
              {
                const variableAttributes = new AttrList(attributes);
                substituteVariablesInAttributes(parsed, variableAttributes, ['NAME', 'VALUE', 'QUERYPARAM']);
                addVariableDefinition(parsed, variableAttributes, baseurl);
              }
              break;
            }
          case 'CONTENT-STEERING':
            {
              // #EXT-X-CONTENT-STEERING
              const contentSteeringAttributes = new AttrList(attributes);
              {
                substituteVariablesInAttributes(parsed, contentSteeringAttributes, ['SERVER-URI', 'PATHWAY-ID']);
              }
              parsed.contentSteering = {
                uri: M3U8Parser.resolve(contentSteeringAttributes['SERVER-URI'], baseurl),
                pathwayId: contentSteeringAttributes['PATHWAY-ID'] || '.'
              };
              break;
            }
          case 'START':
            {
              // #EXT-X-START
              parsed.startTimeOffset = parseStartTimeOffset(attributes);
              break;
            }
        }
      }
    }
    // Filter out levels with unknown codecs if it does not remove all levels
    const stripUnknownCodecLevels = levelsWithKnownCodecs.length > 0 && levelsWithKnownCodecs.length < parsed.levels.length;
    parsed.levels = stripUnknownCodecLevels ? levelsWithKnownCodecs : parsed.levels;
    if (parsed.levels.length === 0) {
      parsed.playlistParsingError = new Error('no levels found in manifest');
    }
    return parsed;
  }
  static parseMasterPlaylistMedia(string, baseurl, parsed) {
    let result;
    const results = {};
    const levels = parsed.levels;
    const groupsByType = {
      AUDIO: levels.map(level => ({
        id: level.attrs.AUDIO,
        audioCodec: level.audioCodec
      })),
      SUBTITLES: levels.map(level => ({
        id: level.attrs.SUBTITLES,
        textCodec: level.textCodec
      })),
      'CLOSED-CAPTIONS': []
    };
    let id = 0;
    MASTER_PLAYLIST_MEDIA_REGEX.lastIndex = 0;
    while ((result = MASTER_PLAYLIST_MEDIA_REGEX.exec(string)) !== null) {
      const attrs = new AttrList(result[1]);
      const type = attrs.TYPE;
      if (type) {
        const groups = groupsByType[type];
        const medias = results[type] || [];
        results[type] = medias;
        {
          substituteVariablesInAttributes(parsed, attrs, ['URI', 'GROUP-ID', 'LANGUAGE', 'ASSOC-LANGUAGE', 'STABLE-RENDITION-ID', 'NAME', 'INSTREAM-ID', 'CHARACTERISTICS', 'CHANNELS']);
        }
        const media = {
          attrs,
          bitrate: 0,
          id: id++,
          groupId: attrs['GROUP-ID'] || '',
          instreamId: attrs['INSTREAM-ID'],
          name: attrs.NAME || attrs.LANGUAGE || '',
          type,
          default: attrs.bool('DEFAULT'),
          autoselect: attrs.bool('AUTOSELECT'),
          forced: attrs.bool('FORCED'),
          lang: attrs.LANGUAGE,
          url: attrs.URI ? M3U8Parser.resolve(attrs.URI, baseurl) : ''
        };
        if (groups != null && groups.length) {
          // If there are audio or text groups signalled in the manifest, let's look for a matching codec string for this track
          // If we don't find the track signalled, lets use the first audio groups codec we have
          // Acting as a best guess
          const groupCodec = M3U8Parser.findGroup(groups, media.groupId) || groups[0];
          assignCodec(media, groupCodec, 'audioCodec');
          assignCodec(media, groupCodec, 'textCodec');
        }
        medias.push(media);
      }
    }
    return results;
  }
  static parseLevelPlaylist(string, baseurl, id, type, levelUrlId, multivariantVariableList) {
    const level = new LevelDetails(baseurl);
    const fragments = level.fragments;
    // The most recent init segment seen (applies to all subsequent segments)
    let currentInitSegment = null;
    let currentSN = 0;
    let currentPart = 0;
    let totalduration = 0;
    let discontinuityCounter = 0;
    let prevFrag = null;
    let frag = new Fragment(type, baseurl);
    let result;
    let i;
    let levelkeys;
    let firstPdtIndex = -1;
    let createNextFrag = false;
    LEVEL_PLAYLIST_REGEX_FAST.lastIndex = 0;
    level.m3u8 = string;
    level.hasVariableRefs = hasVariableReferences(string) ;
    while ((result = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) !== null) {
      if (createNextFrag) {
        createNextFrag = false;
        frag = new Fragment(type, baseurl);
        // setup the next fragment for part loading
        frag.start = totalduration;
        frag.sn = currentSN;
        frag.cc = discontinuityCounter;
        frag.level = id;
        if (currentInitSegment) {
          frag.initSegment = currentInitSegment;
          frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
          currentInitSegment.rawProgramDateTime = null;
        }
      }
      const duration = result[1];
      if (duration) {
        // INF
        frag.duration = parseFloat(duration);
        // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
        const title = (' ' + result[2]).slice(1);
        frag.title = title || null;
        frag.tagList.push(title ? ['INF', duration, title] : ['INF', duration]);
      } else if (result[3]) {
        // url
        if (isFiniteNumber(frag.duration)) {
          frag.start = totalduration;
          if (levelkeys) {
            setFragLevelKeys(frag, levelkeys, level);
          }
          frag.sn = currentSN;
          frag.level = id;
          frag.cc = discontinuityCounter;
          frag.urlId = levelUrlId;
          fragments.push(frag);
          // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
          const uri = (' ' + result[3]).slice(1);
          frag.relurl = substituteVariables(level, uri) ;
          assignProgramDateTime(frag, prevFrag);
          prevFrag = frag;
          totalduration += frag.duration;
          currentSN++;
          currentPart = 0;
          createNextFrag = true;
        }
      } else if (result[4]) {
        // X-BYTERANGE
        const data = (' ' + result[4]).slice(1);
        if (prevFrag) {
          frag.setByteRange(data, prevFrag);
        } else {
          frag.setByteRange(data);
        }
      } else if (result[5]) {
        // PROGRAM-DATE-TIME
        // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
        frag.rawProgramDateTime = (' ' + result[5]).slice(1);
        frag.tagList.push(['PROGRAM-DATE-TIME', frag.rawProgramDateTime]);
        if (firstPdtIndex === -1) {
          firstPdtIndex = fragments.length;
        }
      } else {
        result = result[0].match(LEVEL_PLAYLIST_REGEX_SLOW);
        if (!result) {
          logger.warn('No matches on slow regex match for level playlist!');
          continue;
        }
        for (i = 1; i < result.length; i++) {
          if (typeof result[i] !== 'undefined') {
            break;
          }
        }

        // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
        const tag = (' ' + result[i]).slice(1);
        const value1 = (' ' + result[i + 1]).slice(1);
        const value2 = result[i + 2] ? (' ' + result[i + 2]).slice(1) : '';
        switch (tag) {
          case 'PLAYLIST-TYPE':
            level.type = value1.toUpperCase();
            break;
          case 'MEDIA-SEQUENCE':
            currentSN = level.startSN = parseInt(value1);
            break;
          case 'SKIP':
            {
              const skipAttrs = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, skipAttrs, ['RECENTLY-REMOVED-DATERANGES']);
              }
              const skippedSegments = skipAttrs.decimalInteger('SKIPPED-SEGMENTS');
              if (isFiniteNumber(skippedSegments)) {
                level.skippedSegments = skippedSegments;
                // This will result in fragments[] containing undefined values, which we will fill in with `mergeDetails`
                for (let _i = skippedSegments; _i--;) {
                  fragments.unshift(null);
                }
                currentSN += skippedSegments;
              }
              const recentlyRemovedDateranges = skipAttrs.enumeratedString('RECENTLY-REMOVED-DATERANGES');
              if (recentlyRemovedDateranges) {
                level.recentlyRemovedDateranges = recentlyRemovedDateranges.split('\t');
              }
              break;
            }
          case 'TARGETDURATION':
            level.targetduration = Math.max(parseInt(value1), 1);
            break;
          case 'VERSION':
            level.version = parseInt(value1);
            break;
          case 'EXTM3U':
            break;
          case 'ENDLIST':
            level.live = false;
            break;
          case '#':
            if (value1 || value2) {
              frag.tagList.push(value2 ? [value1, value2] : [value1]);
            }
            break;
          case 'DISCONTINUITY':
            discontinuityCounter++;
            frag.tagList.push(['DIS']);
            break;
          case 'GAP':
            frag.gap = true;
            frag.tagList.push([tag]);
            break;
          case 'BITRATE':
            frag.tagList.push([tag, value1]);
            break;
          case 'DATERANGE':
            {
              const dateRangeAttr = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, dateRangeAttr, ['ID', 'CLASS', 'START-DATE', 'END-DATE', 'SCTE35-CMD', 'SCTE35-OUT', 'SCTE35-IN']);
                substituteVariablesInAttributes(level, dateRangeAttr, dateRangeAttr.clientAttrs);
              }
              const dateRange = new DateRange(dateRangeAttr, level.dateRanges[dateRangeAttr.ID]);
              if (dateRange.isValid || level.skippedSegments) {
                level.dateRanges[dateRange.id] = dateRange;
              } else {
                logger.warn(`Ignoring invalid DATERANGE tag: "${value1}"`);
              }
              // Add to fragment tag list for backwards compatibility (< v1.2.0)
              frag.tagList.push(['EXT-X-DATERANGE', value1]);
              break;
            }
          case 'DEFINE':
            {
              {
                const variableAttributes = new AttrList(value1);
                substituteVariablesInAttributes(level, variableAttributes, ['NAME', 'VALUE', 'IMPORT', 'QUERYPARAM']);
                if ('IMPORT' in variableAttributes) {
                  importVariableDefinition(level, variableAttributes, multivariantVariableList);
                } else {
                  addVariableDefinition(level, variableAttributes, baseurl);
                }
              }
              break;
            }
          case 'DISCONTINUITY-SEQUENCE':
            discontinuityCounter = parseInt(value1);
            break;
          case 'KEY':
            {
              const levelKey = parseKey(value1, baseurl, level);
              if (levelKey.isSupported()) {
                if (levelKey.method === 'NONE') {
                  levelkeys = undefined;
                  break;
                }
                if (!levelkeys) {
                  levelkeys = {};
                }
                if (levelkeys[levelKey.keyFormat]) {
                  levelkeys = _extends({}, levelkeys);
                }
                levelkeys[levelKey.keyFormat] = levelKey;
              } else {
                logger.warn(`[Keys] Ignoring invalid EXT-X-KEY tag: "${value1}"`);
              }
              break;
            }
          case 'START':
            level.startTimeOffset = parseStartTimeOffset(value1);
            break;
          case 'MAP':
            {
              const mapAttrs = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, mapAttrs, ['BYTERANGE', 'URI']);
              }
              if (frag.duration) {
                // Initial segment tag is after segment duration tag.
                //   #EXTINF: 6.0
                //   #EXT-X-MAP:URI="init.mp4
                const init = new Fragment(type, baseurl);
                setInitSegment(init, mapAttrs, id, levelkeys);
                currentInitSegment = init;
                frag.initSegment = currentInitSegment;
                if (currentInitSegment.rawProgramDateTime && !frag.rawProgramDateTime) {
                  frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
                }
              } else {
                // Initial segment tag is before segment duration tag
                setInitSegment(frag, mapAttrs, id, levelkeys);
                currentInitSegment = frag;
                createNextFrag = true;
              }
              break;
            }
          case 'SERVER-CONTROL':
            {
              const serverControlAttrs = new AttrList(value1);
              level.canBlockReload = serverControlAttrs.bool('CAN-BLOCK-RELOAD');
              level.canSkipUntil = serverControlAttrs.optionalFloat('CAN-SKIP-UNTIL', 0);
              level.canSkipDateRanges = level.canSkipUntil > 0 && serverControlAttrs.bool('CAN-SKIP-DATERANGES');
              level.partHoldBack = serverControlAttrs.optionalFloat('PART-HOLD-BACK', 0);
              level.holdBack = serverControlAttrs.optionalFloat('HOLD-BACK', 0);
              break;
            }
          case 'PART-INF':
            {
              const partInfAttrs = new AttrList(value1);
              level.partTarget = partInfAttrs.decimalFloatingPoint('PART-TARGET');
              break;
            }
          case 'PART':
            {
              let partList = level.partList;
              if (!partList) {
                partList = level.partList = [];
              }
              const previousFragmentPart = currentPart > 0 ? partList[partList.length - 1] : undefined;
              const index = currentPart++;
              const partAttrs = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, partAttrs, ['BYTERANGE', 'URI']);
              }
              const part = new Part(partAttrs, frag, baseurl, index, previousFragmentPart);
              partList.push(part);
              frag.duration += part.duration;
              break;
            }
          case 'PRELOAD-HINT':
            {
              const preloadHintAttrs = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, preloadHintAttrs, ['URI']);
              }
              level.preloadHint = preloadHintAttrs;
              break;
            }
          case 'RENDITION-REPORT':
            {
              const renditionReportAttrs = new AttrList(value1);
              {
                substituteVariablesInAttributes(level, renditionReportAttrs, ['URI']);
              }
              level.renditionReports = level.renditionReports || [];
              level.renditionReports.push(renditionReportAttrs);
              break;
            }
          default:
            logger.warn(`line parsed but not handled: ${result}`);
            break;
        }
      }
    }
    if (prevFrag && !prevFrag.relurl) {
      fragments.pop();
      totalduration -= prevFrag.duration;
      if (level.partList) {
        level.fragmentHint = prevFrag;
      }
    } else if (level.partList) {
      assignProgramDateTime(frag, prevFrag);
      frag.cc = discontinuityCounter;
      level.fragmentHint = frag;
      if (levelkeys) {
        setFragLevelKeys(frag, levelkeys, level);
      }
    }
    const fragmentLength = fragments.length;
    const firstFragment = fragments[0];
    const lastFragment = fragments[fragmentLength - 1];
    totalduration += level.skippedSegments * level.targetduration;
    if (totalduration > 0 && fragmentLength && lastFragment) {
      level.averagetargetduration = totalduration / fragmentLength;
      const lastSn = lastFragment.sn;
      level.endSN = lastSn !== 'initSegment' ? lastSn : 0;
      if (!level.live) {
        lastFragment.endList = true;
      }
      if (firstFragment) {
        level.startCC = firstFragment.cc;
      }
    } else {
      level.endSN = 0;
      level.startCC = 0;
    }
    if (level.fragmentHint) {
      totalduration += level.fragmentHint.duration;
    }
    level.totalduration = totalduration;
    level.endCC = discontinuityCounter;

    /**
     * Backfill any missing PDT values
     * "If the first EXT-X-PROGRAM-DATE-TIME tag in a Playlist appears after
     * one or more Media Segment URIs, the client SHOULD extrapolate
     * backward from that tag (using EXTINF durations and/or media
     * timestamps) to associate dates with those segments."
     * We have already extrapolated forward, but all fragments up to the first instance of PDT do not have their PDTs
     * computed.
     */
    if (firstPdtIndex > 0) {
      backfillProgramDateTimes(fragments, firstPdtIndex);
    }
    return level;
  }
}
function parseKey(keyTagAttributes, baseurl, parsed) {
  var _keyAttrs$METHOD, _keyAttrs$KEYFORMAT;
  // https://tools.ietf.org/html/rfc8216#section-4.3.2.4
  const keyAttrs = new AttrList(keyTagAttributes);
  {
    substituteVariablesInAttributes(parsed, keyAttrs, ['KEYFORMAT', 'KEYFORMATVERSIONS', 'URI', 'IV', 'URI']);
  }
  const decryptmethod = (_keyAttrs$METHOD = keyAttrs.METHOD) != null ? _keyAttrs$METHOD : '';
  const decrypturi = keyAttrs.URI;
  const decryptiv = keyAttrs.hexadecimalInteger('IV');
  const decryptkeyformatversions = keyAttrs.KEYFORMATVERSIONS;
  // From RFC: This attribute is OPTIONAL; its absence indicates an implicit value of "identity".
  const decryptkeyformat = (_keyAttrs$KEYFORMAT = keyAttrs.KEYFORMAT) != null ? _keyAttrs$KEYFORMAT : 'identity';
  if (decrypturi && keyAttrs.IV && !decryptiv) {
    logger.error(`Invalid IV: ${keyAttrs.IV}`);
  }
  // If decrypturi is a URI with a scheme, then baseurl will be ignored
  // No uri is allowed when METHOD is NONE
  const resolvedUri = decrypturi ? M3U8Parser.resolve(decrypturi, baseurl) : '';
  const keyFormatVersions = (decryptkeyformatversions ? decryptkeyformatversions : '1').split('/').map(Number).filter(Number.isFinite);
  return new LevelKey(decryptmethod, resolvedUri, decryptkeyformat, keyFormatVersions, decryptiv);
}
function parseStartTimeOffset(startAttributes) {
  const startAttrs = new AttrList(startAttributes);
  const startTimeOffset = startAttrs.decimalFloatingPoint('TIME-OFFSET');
  if (isFiniteNumber(startTimeOffset)) {
    return startTimeOffset;
  }
  return null;
}
function setCodecs(codecs, level) {
  ['video', 'audio', 'text'].forEach(type => {
    const filtered = codecs.filter(codec => isCodecType(codec, type));
    if (filtered.length) {
      const preferred = filtered.filter(codec => {
        return codec.lastIndexOf('avc1', 0) === 0 || codec.lastIndexOf('mp4a', 0) === 0;
      });
      level[`${type}Codec`] = preferred.length > 0 ? preferred[0] : filtered[0];

      // remove from list
      codecs = codecs.filter(codec => filtered.indexOf(codec) === -1);
    }
  });
  level.unknownCodecs = codecs;
}
function assignCodec(media, groupItem, codecProperty) {
  const codecValue = groupItem[codecProperty];
  if (codecValue) {
    media[codecProperty] = codecValue;
  }
}
function backfillProgramDateTimes(fragments, firstPdtIndex) {
  let fragPrev = fragments[firstPdtIndex];
  for (let i = firstPdtIndex; i--;) {
    const frag = fragments[i];
    // Exit on delta-playlist skipped segments
    if (!frag) {
      return;
    }
    frag.programDateTime = fragPrev.programDateTime - frag.duration * 1000;
    fragPrev = frag;
  }
}
function assignProgramDateTime(frag, prevFrag) {
  if (frag.rawProgramDateTime) {
    frag.programDateTime = Date.parse(frag.rawProgramDateTime);
  } else if (prevFrag != null && prevFrag.programDateTime) {
    frag.programDateTime = prevFrag.endProgramDateTime;
  }
  if (!isFiniteNumber(frag.programDateTime)) {
    frag.programDateTime = null;
    frag.rawProgramDateTime = null;
  }
}
function setInitSegment(frag, mapAttrs, id, levelkeys) {
  frag.relurl = mapAttrs.URI;
  if (mapAttrs.BYTERANGE) {
    frag.setByteRange(mapAttrs.BYTERANGE);
  }
  frag.level = id;
  frag.sn = 'initSegment';
  if (levelkeys) {
    frag.levelkeys = levelkeys;
  }
  frag.initSegment = null;
}
function setFragLevelKeys(frag, levelkeys, level) {
  frag.levelkeys = levelkeys;
  const {
    encryptedFragments
  } = level;
  if ((!encryptedFragments.length || encryptedFragments[encryptedFragments.length - 1].levelkeys !== levelkeys) && Object.keys(levelkeys).some(format => levelkeys[format].isCommonEncryption)) {
    encryptedFragments.push(frag);
  }
}

var PlaylistContextType = {
  MANIFEST: "manifest",
  LEVEL: "level",
  AUDIO_TRACK: "audioTrack",
  SUBTITLE_TRACK: "subtitleTrack"
};
var PlaylistLevelType = {
  MAIN: "main",
  AUDIO: "audio",
  SUBTITLE: "subtitle"
};

function mapContextToLevelType(context) {
  const {
    type
  } = context;
  switch (type) {
    case PlaylistContextType.AUDIO_TRACK:
      return PlaylistLevelType.AUDIO;
    case PlaylistContextType.SUBTITLE_TRACK:
      return PlaylistLevelType.SUBTITLE;
    default:
      return PlaylistLevelType.MAIN;
  }
}
function getResponseUrl(response, context) {
  let url = response.url;
  // responseURL not supported on some browsers (it is used to detect URL redirection)
  // data-uri mode also not supported (but no need to detect redirection)
  if (url === undefined || url.indexOf('data:') === 0) {
    // fallback to initial URL
    url = context.url;
  }
  return url;
}
class PlaylistLoader {
  constructor(hls) {
    this.hls = void 0;
    this.loaders = Object.create(null);
    this.variableList = null;
    this.hls = hls;
    this.registerListeners();
  }
  startLoad(startPosition) {}
  stopLoad() {
    this.destroyInternalLoaders();
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
    hls.on(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
  }
  unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.off(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
    hls.off(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
  }

  /**
   * Returns defaults or configured loader-type overloads (pLoader and loader config params)
   */
  createInternalLoader(context) {
    const config = this.hls.config;
    const PLoader = config.pLoader;
    const Loader = config.loader;
    const InternalLoader = PLoader || Loader;
    const loader = new InternalLoader(config);
    this.loaders[context.type] = loader;
    return loader;
  }
  getInternalLoader(context) {
    return this.loaders[context.type];
  }
  resetInternalLoader(contextType) {
    if (this.loaders[contextType]) {
      delete this.loaders[contextType];
    }
  }

  /**
   * Call `destroy` on all internal loader instances mapped (one per context type)
   */
  destroyInternalLoaders() {
    for (const contextType in this.loaders) {
      const loader = this.loaders[contextType];
      if (loader) {
        loader.destroy();
      }
      this.resetInternalLoader(contextType);
    }
  }
  destroy() {
    this.variableList = null;
    this.unregisterListeners();
    this.destroyInternalLoaders();
  }
  onManifestLoading(event, data) {
    const {
      url
    } = data;
    this.variableList = null;
    this.load({
      id: null,
      level: 0,
      responseType: 'text',
      type: PlaylistContextType.MANIFEST,
      url,
      deliveryDirectives: null
    });
  }
  onLevelLoading(event, data) {
    const {
      id,
      level,
      url,
      deliveryDirectives
    } = data;
    this.load({
      id,
      level,
      responseType: 'text',
      type: PlaylistContextType.LEVEL,
      url,
      deliveryDirectives
    });
  }
  onAudioTrackLoading(event, data) {
    const {
      id,
      groupId,
      url,
      deliveryDirectives
    } = data;
    this.load({
      id,
      groupId,
      level: null,
      responseType: 'text',
      type: PlaylistContextType.AUDIO_TRACK,
      url,
      deliveryDirectives
    });
  }
  onSubtitleTrackLoading(event, data) {
    const {
      id,
      groupId,
      url,
      deliveryDirectives
    } = data;
    this.load({
      id,
      groupId,
      level: null,
      responseType: 'text',
      type: PlaylistContextType.SUBTITLE_TRACK,
      url,
      deliveryDirectives
    });
  }
  load(context) {
    var _context$deliveryDire;
    const config = this.hls.config;

    // logger.debug(`[playlist-loader]: Loading playlist of type ${context.type}, level: ${context.level}, id: ${context.id}`);

    // Check if a loader for this context already exists
    let loader = this.getInternalLoader(context);
    if (loader) {
      const loaderContext = loader.context;
      if (loaderContext && loaderContext.url === context.url) {
        // same URL can't overlap
        logger.trace('[playlist-loader]: playlist request ongoing');
        return;
      }
      logger.log(`[playlist-loader]: aborting previous loader for type: ${context.type}`);
      loader.abort();
    }

    // apply different configs for retries depending on
    // context (manifest, level, audio/subs playlist)
    let loadPolicy;
    if (context.type === PlaylistContextType.MANIFEST) {
      loadPolicy = config.manifestLoadPolicy.default;
    } else {
      loadPolicy = _extends({}, config.playlistLoadPolicy.default, {
        timeoutRetry: null,
        errorRetry: null
      });
    }
    loader = this.createInternalLoader(context);

    // Override level/track timeout for LL-HLS requests
    // (the default of 10000ms is counter productive to blocking playlist reload requests)
    if ((_context$deliveryDire = context.deliveryDirectives) != null && _context$deliveryDire.part) {
      let levelDetails;
      if (context.type === PlaylistContextType.LEVEL && context.level !== null) {
        levelDetails = this.hls.levels[context.level].details;
      } else if (context.type === PlaylistContextType.AUDIO_TRACK && context.id !== null) {
        levelDetails = this.hls.audioTracks[context.id].details;
      } else if (context.type === PlaylistContextType.SUBTITLE_TRACK && context.id !== null) {
        levelDetails = this.hls.subtitleTracks[context.id].details;
      }
      if (levelDetails) {
        const partTarget = levelDetails.partTarget;
        const targetDuration = levelDetails.targetduration;
        if (partTarget && targetDuration) {
          const maxLowLatencyPlaylistRefresh = Math.max(partTarget * 3, targetDuration * 0.8) * 1000;
          loadPolicy = _extends({}, loadPolicy, {
            maxTimeToFirstByteMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs),
            maxLoadTimeMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs)
          });
        }
      }
    }
    const legacyRetryCompatibility = loadPolicy.errorRetry || loadPolicy.timeoutRetry || {};
    const loaderConfig = {
      loadPolicy,
      timeout: loadPolicy.maxLoadTimeMs,
      maxRetry: legacyRetryCompatibility.maxNumRetry || 0,
      retryDelay: legacyRetryCompatibility.retryDelayMs || 0,
      maxRetryDelay: legacyRetryCompatibility.maxRetryDelayMs || 0
    };
    const loaderCallbacks = {
      onSuccess: (response, stats, context, networkDetails) => {
        const loader = this.getInternalLoader(context);
        this.resetInternalLoader(context.type);
        const string = response.data;

        // Validate if it is an M3U8 at all
        if (string.indexOf('#EXTM3U') !== 0) {
          this.handleManifestParsingError(response, context, new Error('no EXTM3U delimiter'), networkDetails || null, stats);
          return;
        }
        stats.parsing.start = performance.now();
        if (M3U8Parser.isMediaPlaylist(string)) {
          this.handleTrackOrLevelPlaylist(response, stats, context, networkDetails || null, loader);
        } else {
          this.handleMasterPlaylist(response, stats, context, networkDetails);
        }
      },
      onError: (response, context, networkDetails, stats) => {
        this.handleNetworkError(context, networkDetails, false, response, stats);
      },
      onTimeout: (stats, context, networkDetails) => {
        this.handleNetworkError(context, networkDetails, true, undefined, stats);
      }
    };

    // logger.debug(`[playlist-loader]: Calling internal loader delegate for URL: ${context.url}`);

    loader.load(context, loaderConfig, loaderCallbacks);
  }
  handleMasterPlaylist(response, stats, context, networkDetails) {
    const hls = this.hls;
    const string = response.data;
    const url = getResponseUrl(response, context);
    const parsedResult = M3U8Parser.parseMasterPlaylist(string, url);
    if (parsedResult.playlistParsingError) {
      this.handleManifestParsingError(response, context, parsedResult.playlistParsingError, networkDetails, stats);
      return;
    }
    const {
      contentSteering,
      levels,
      sessionData,
      sessionKeys,
      startTimeOffset,
      variableList
    } = parsedResult;
    this.variableList = variableList;
    const {
      AUDIO: audioTracks = [],
      SUBTITLES: subtitles,
      'CLOSED-CAPTIONS': captions
    } = M3U8Parser.parseMasterPlaylistMedia(string, url, parsedResult);
    if (audioTracks.length) {
      // check if we have found an audio track embedded in main playlist (audio track without URI attribute)
      const embeddedAudioFound = audioTracks.some(audioTrack => !audioTrack.url);

      // if no embedded audio track defined, but audio codec signaled in quality level,
      // we need to signal this main audio track this could happen with playlists with
      // alt audio rendition in which quality levels (main)
      // contains both audio+video. but with mixed audio track not signaled
      if (!embeddedAudioFound && levels[0].audioCodec && !levels[0].attrs.AUDIO) {
        logger.log('[playlist-loader]: audio codec signaled in quality level, but no embedded audio track signaled, create one');
        audioTracks.unshift({
          type: 'main',
          name: 'main',
          groupId: 'main',
          default: false,
          autoselect: false,
          forced: false,
          id: -1,
          attrs: new AttrList({}),
          bitrate: 0,
          url: ''
        });
      }
    }
    hls.trigger(Events.MANIFEST_LOADED, {
      levels,
      audioTracks,
      subtitles,
      captions,
      contentSteering,
      url,
      stats,
      networkDetails,
      sessionData,
      sessionKeys,
      startTimeOffset,
      variableList
    });
  }
  handleTrackOrLevelPlaylist(response, stats, context, networkDetails, loader) {
    const hls = this.hls;
    const {
      id,
      level,
      type
    } = context;
    const url = getResponseUrl(response, context);
    const levelUrlId = isFiniteNumber(id) ? id : 0;
    const levelId = isFiniteNumber(level) ? level : levelUrlId;
    const levelType = mapContextToLevelType(context);
    const levelDetails = M3U8Parser.parseLevelPlaylist(response.data, url, levelId, levelType, levelUrlId, this.variableList);

    // We have done our first request (Manifest-type) and receive
    // not a master playlist but a chunk-list (track/level)
    // We fire the manifest-loaded event anyway with the parsed level-details
    // by creating a single-level structure for it.
    if (type === PlaylistContextType.MANIFEST) {
      const singleLevel = {
        attrs: new AttrList({}),
        bitrate: 0,
        details: levelDetails,
        name: '',
        url
      };
      hls.trigger(Events.MANIFEST_LOADED, {
        levels: [singleLevel],
        audioTracks: [],
        url,
        stats,
        networkDetails,
        sessionData: null,
        sessionKeys: null,
        contentSteering: null,
        startTimeOffset: null,
        variableList: null
      });
    }

    // save parsing time
    stats.parsing.end = performance.now();

    // extend the context with the new levelDetails property
    context.levelDetails = levelDetails;
    this.handlePlaylistLoaded(levelDetails, response, stats, context, networkDetails, loader);
  }
  handleManifestParsingError(response, context, error, networkDetails, stats) {
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.NETWORK_ERROR,
      details: ErrorDetails.MANIFEST_PARSING_ERROR,
      fatal: context.type === PlaylistContextType.MANIFEST,
      url: response.url,
      err: error,
      error,
      reason: error.message,
      response,
      context,
      networkDetails,
      stats
    });
  }
  handleNetworkError(context, networkDetails, timeout = false, response, stats) {
    let message = `A network ${timeout ? 'timeout' : 'error' + (response ? ' (status ' + response.code + ')' : '')} occurred while loading ${context.type}`;
    if (context.type === PlaylistContextType.LEVEL) {
      message += `: ${context.level} id: ${context.id}`;
    } else if (context.type === PlaylistContextType.AUDIO_TRACK || context.type === PlaylistContextType.SUBTITLE_TRACK) {
      message += ` id: ${context.id} group-id: "${context.groupId}"`;
    }
    const error = new Error(message);
    logger.warn(`[playlist-loader]: ${message}`);
    let details = ErrorDetails.UNKNOWN;
    let fatal = false;
    const loader = this.getInternalLoader(context);
    switch (context.type) {
      case PlaylistContextType.MANIFEST:
        details = timeout ? ErrorDetails.MANIFEST_LOAD_TIMEOUT : ErrorDetails.MANIFEST_LOAD_ERROR;
        fatal = true;
        break;
      case PlaylistContextType.LEVEL:
        details = timeout ? ErrorDetails.LEVEL_LOAD_TIMEOUT : ErrorDetails.LEVEL_LOAD_ERROR;
        fatal = false;
        break;
      case PlaylistContextType.AUDIO_TRACK:
        details = timeout ? ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT : ErrorDetails.AUDIO_TRACK_LOAD_ERROR;
        fatal = false;
        break;
      case PlaylistContextType.SUBTITLE_TRACK:
        details = timeout ? ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT : ErrorDetails.SUBTITLE_LOAD_ERROR;
        fatal = false;
        break;
    }
    if (loader) {
      this.resetInternalLoader(context.type);
    }
    const errorData = {
      type: ErrorTypes.NETWORK_ERROR,
      details,
      fatal,
      url: context.url,
      loader,
      context,
      error,
      networkDetails,
      stats
    };
    if (response) {
      const url = (networkDetails == null ? void 0 : networkDetails.url) || context.url;
      errorData.response = _objectSpread2({
        url,
        data: undefined
      }, response);
    }
    this.hls.trigger(Events.ERROR, errorData);
  }
  handlePlaylistLoaded(levelDetails, response, stats, context, networkDetails, loader) {
    const hls = this.hls;
    const {
      type,
      level,
      id,
      groupId,
      deliveryDirectives
    } = context;
    const url = getResponseUrl(response, context);
    const parent = mapContextToLevelType(context);
    const levelIndex = typeof context.level === 'number' && parent === PlaylistLevelType.MAIN ? level : undefined;
    if (!levelDetails.fragments.length) {
      const _error = new Error('No Segments found in Playlist');
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.NETWORK_ERROR,
        details: ErrorDetails.LEVEL_EMPTY_ERROR,
        fatal: false,
        url,
        error: _error,
        reason: _error.message,
        response,
        context,
        level: levelIndex,
        parent,
        networkDetails,
        stats
      });
      return;
    }
    if (!levelDetails.targetduration) {
      levelDetails.playlistParsingError = new Error('Missing Target Duration');
    }
    const error = levelDetails.playlistParsingError;
    if (error) {
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.NETWORK_ERROR,
        details: ErrorDetails.LEVEL_PARSING_ERROR,
        fatal: false,
        url,
        error,
        reason: error.message,
        response,
        context,
        level: levelIndex,
        parent,
        networkDetails,
        stats
      });
      return;
    }
    if (levelDetails.live && loader) {
      if (loader.getCacheAge) {
        levelDetails.ageHeader = loader.getCacheAge() || 0;
      }
      if (!loader.getCacheAge || isNaN(levelDetails.ageHeader)) {
        levelDetails.ageHeader = 0;
      }
    }
    switch (type) {
      case PlaylistContextType.MANIFEST:
      case PlaylistContextType.LEVEL:
        hls.trigger(Events.LEVEL_LOADED, {
          details: levelDetails,
          level: levelIndex || 0,
          id: id || 0,
          stats,
          networkDetails,
          deliveryDirectives
        });
        break;
      case PlaylistContextType.AUDIO_TRACK:
        hls.trigger(Events.AUDIO_TRACK_LOADED, {
          details: levelDetails,
          id: id || 0,
          groupId: groupId || '',
          stats,
          networkDetails,
          deliveryDirectives
        });
        break;
      case PlaylistContextType.SUBTITLE_TRACK:
        hls.trigger(Events.SUBTITLE_TRACK_LOADED, {
          details: levelDetails,
          id: id || 0,
          groupId: groupId || '',
          stats,
          networkDetails,
          deliveryDirectives
        });
        break;
    }
  }
}

function sendAddTrackEvent(track, videoEl) {
  let event;
  try {
    event = new Event('addtrack');
  } catch (err) {
    // for IE11
    event = document.createEvent('Event');
    event.initEvent('addtrack', false, false);
  }
  event.track = track;
  videoEl.dispatchEvent(event);
}
function addCueToTrack(track, cue) {
  // Sometimes there are cue overlaps on segmented vtts so the same
  // cue can appear more than once in different vtt files.
  // This avoid showing duplicated cues with same timecode and text.
  const mode = track.mode;
  if (mode === 'disabled') {
    track.mode = 'hidden';
  }
  if (track.cues && !track.cues.getCueById(cue.id)) {
    try {
      track.addCue(cue);
      if (!track.cues.getCueById(cue.id)) {
        throw new Error(`addCue is failed for: ${cue}`);
      }
    } catch (err) {
      logger.debug(`[texttrack-utils]: ${err}`);
      try {
        const textTrackCue = new self.TextTrackCue(cue.startTime, cue.endTime, cue.text);
        textTrackCue.id = cue.id;
        track.addCue(textTrackCue);
      } catch (err2) {
        logger.debug(`[texttrack-utils]: Legacy TextTrackCue fallback failed: ${err2}`);
      }
    }
  }
  if (mode === 'disabled') {
    track.mode = mode;
  }
}
function clearCurrentCues(track) {
  // When track.mode is disabled, track.cues will be null.
  // To guarantee the removal of cues, we need to temporarily
  // change the mode to hidden
  const mode = track.mode;
  if (mode === 'disabled') {
    track.mode = 'hidden';
  }
  if (track.cues) {
    for (let i = track.cues.length; i--;) {
      track.removeCue(track.cues[i]);
    }
  }
  if (mode === 'disabled') {
    track.mode = mode;
  }
}
function removeCuesInRange(track, start, end, predicate) {
  const mode = track.mode;
  if (mode === 'disabled') {
    track.mode = 'hidden';
  }
  if (track.cues && track.cues.length > 0) {
    const cues = getCuesInRange(track.cues, start, end);
    for (let i = 0; i < cues.length; i++) {
      if (!predicate || predicate(cues[i])) {
        track.removeCue(cues[i]);
      }
    }
  }
  if (mode === 'disabled') {
    track.mode = mode;
  }
}

// Find first cue starting after given time.
// Modified version of binary search O(log(n)).
function getFirstCueIndexAfterTime(cues, time) {
  // If first cue starts after time, start there
  if (time < cues[0].startTime) {
    return 0;
  }
  // If the last cue ends before time there is no overlap
  const len = cues.length - 1;
  if (time > cues[len].endTime) {
    return -1;
  }
  let left = 0;
  let right = len;
  while (left <= right) {
    const mid = Math.floor((right + left) / 2);
    if (time < cues[mid].startTime) {
      right = mid - 1;
    } else if (time > cues[mid].startTime && left < len) {
      left = mid + 1;
    } else {
      // If it's not lower or higher, it must be equal.
      return mid;
    }
  }
  // At this point, left and right have swapped.
  // No direct match was found, left or right element must be the closest. Check which one has the smallest diff.
  return cues[left].startTime - time < time - cues[right].startTime ? left : right;
}
function getCuesInRange(cues, start, end) {
  const cuesFound = [];
  const firstCueInRange = getFirstCueIndexAfterTime(cues, start);
  if (firstCueInRange > -1) {
    for (let i = firstCueInRange, len = cues.length; i < len; i++) {
      const cue = cues[i];
      if (cue.startTime >= start && cue.endTime <= end) {
        cuesFound.push(cue);
      } else if (cue.startTime > end) {
        return cuesFound;
      }
    }
  }
  return cuesFound;
}

var MetadataSchema = {
  audioId3: "org.id3",
  dateRange: "com.apple.quicktime.HLS",
  emsg: "https://aomedia.org/emsg/ID3"
};

const MIN_CUE_DURATION = 0.25;
function getCueClass() {
  if (typeof self === 'undefined') return undefined;
  return self.VTTCue || self.TextTrackCue;
}
function createCueWithDataFields(Cue, startTime, endTime, data, type) {
  let cue = new Cue(startTime, endTime, '');
  try {
    cue.value = data;
    if (type) {
      cue.type = type;
    }
  } catch (e) {
    cue = new Cue(startTime, endTime, JSON.stringify(type ? _objectSpread2({
      type
    }, data) : data));
  }
  return cue;
}

// VTTCue latest draft allows an infinite duration, fallback
// to MAX_VALUE if necessary
const MAX_CUE_ENDTIME = (() => {
  const Cue = getCueClass();
  try {
    Cue && new Cue(0, Number.POSITIVE_INFINITY, '');
  } catch (e) {
    return Number.MAX_VALUE;
  }
  return Number.POSITIVE_INFINITY;
})();
function dateRangeDateToTimelineSeconds(date, offset) {
  return date.getTime() / 1000 - offset;
}
function hexToArrayBuffer(str) {
  return Uint8Array.from(str.replace(/^0x/, '').replace(/([\da-fA-F]{2}) ?/g, '0x$1 ').replace(/ +$/, '').split(' ')).buffer;
}
class ID3TrackController {
  constructor(hls) {
    this.hls = void 0;
    this.id3Track = null;
    this.media = null;
    this.dateRangeCuesAppended = {};
    this.hls = hls;
    this._registerListeners();
  }
  destroy() {
    this._unregisterListeners();
    this.id3Track = null;
    this.media = null;
    this.dateRangeCuesAppended = {};
    // @ts-ignore
    this.hls = null;
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
  }

  // Add ID3 metatadata text track.
  onMediaAttached(event, data) {
    this.media = data.media;
  }
  onMediaDetaching() {
    if (!this.id3Track) {
      return;
    }
    clearCurrentCues(this.id3Track);
    this.id3Track = null;
    this.media = null;
    this.dateRangeCuesAppended = {};
  }
  onManifestLoading() {
    this.dateRangeCuesAppended = {};
  }
  createTrack(media) {
    const track = this.getID3Track(media.textTracks);
    track.mode = 'hidden';
    return track;
  }
  getID3Track(textTracks) {
    if (!this.media) {
      return;
    }
    for (let i = 0; i < textTracks.length; i++) {
      const textTrack = textTracks[i];
      if (textTrack.kind === 'metadata' && textTrack.label === 'id3') {
        // send 'addtrack' when reusing the textTrack for metadata,
        // same as what we do for captions
        sendAddTrackEvent(textTrack, this.media);
        return textTrack;
      }
    }
    return this.media.addTextTrack('metadata', 'id3');
  }
  onFragParsingMetadata(event, data) {
    if (!this.media) {
      return;
    }
    const {
      hls: {
        config: {
          enableEmsgMetadataCues,
          enableID3MetadataCues
        }
      }
    } = this;
    if (!enableEmsgMetadataCues && !enableID3MetadataCues) {
      return;
    }
    const {
      samples
    } = data;

    // create track dynamically
    if (!this.id3Track) {
      this.id3Track = this.createTrack(this.media);
    }
    const Cue = getCueClass();
    if (!Cue) {
      return;
    }
    for (let i = 0; i < samples.length; i++) {
      const type = samples[i].type;
      if (type === MetadataSchema.emsg && !enableEmsgMetadataCues || !enableID3MetadataCues) {
        continue;
      }
      const frames = getID3Frames(samples[i].data);
      if (frames) {
        const startTime = samples[i].pts;
        let endTime = startTime + samples[i].duration;
        if (endTime > MAX_CUE_ENDTIME) {
          endTime = MAX_CUE_ENDTIME;
        }
        const timeDiff = endTime - startTime;
        if (timeDiff <= 0) {
          endTime = startTime + MIN_CUE_DURATION;
        }
        for (let j = 0; j < frames.length; j++) {
          const frame = frames[j];
          // Safari doesn't put the timestamp frame in the TextTrack
          if (!isTimeStampFrame(frame)) {
            // add a bounds to any unbounded cues
            this.updateId3CueEnds(startTime, type);
            const cue = createCueWithDataFields(Cue, startTime, endTime, frame, type);
            if (cue) {
              this.id3Track.addCue(cue);
            }
          }
        }
      }
    }
  }
  updateId3CueEnds(startTime, type) {
    var _this$id3Track;
    const cues = (_this$id3Track = this.id3Track) == null ? void 0 : _this$id3Track.cues;
    if (cues) {
      for (let i = cues.length; i--;) {
        const cue = cues[i];
        if (cue.type === type && cue.startTime < startTime && cue.endTime === MAX_CUE_ENDTIME) {
          cue.endTime = startTime;
        }
      }
    }
  }
  onBufferFlushing(event, {
    startOffset,
    endOffset,
    type
  }) {
    const {
      id3Track,
      hls
    } = this;
    if (!hls) {
      return;
    }
    const {
      config: {
        enableEmsgMetadataCues,
        enableID3MetadataCues
      }
    } = hls;
    if (id3Track && (enableEmsgMetadataCues || enableID3MetadataCues)) {
      let predicate;
      if (type === 'audio') {
        predicate = cue => cue.type === MetadataSchema.audioId3 && enableID3MetadataCues;
      } else if (type === 'video') {
        predicate = cue => cue.type === MetadataSchema.emsg && enableEmsgMetadataCues;
      } else {
        predicate = cue => cue.type === MetadataSchema.audioId3 && enableID3MetadataCues || cue.type === MetadataSchema.emsg && enableEmsgMetadataCues;
      }
      removeCuesInRange(id3Track, startOffset, endOffset, predicate);
    }
  }
  onLevelUpdated(event, {
    details
  }) {
    if (!this.media || !details.hasProgramDateTime || !this.hls.config.enableDateRangeMetadataCues) {
      return;
    }
    const {
      dateRangeCuesAppended,
      id3Track
    } = this;
    const {
      dateRanges
    } = details;
    const ids = Object.keys(dateRanges);
    // Remove cues from track not found in details.dateRanges
    if (id3Track) {
      const idsToRemove = Object.keys(dateRangeCuesAppended).filter(id => !ids.includes(id));
      for (let i = idsToRemove.length; i--;) {
        const id = idsToRemove[i];
        Object.keys(dateRangeCuesAppended[id].cues).forEach(key => {
          id3Track.removeCue(dateRangeCuesAppended[id].cues[key]);
        });
        delete dateRangeCuesAppended[id];
      }
    }
    // Exit if the playlist does not have Date Ranges or does not have Program Date Time
    const lastFragment = details.fragments[details.fragments.length - 1];
    if (ids.length === 0 || !isFiniteNumber(lastFragment == null ? void 0 : lastFragment.programDateTime)) {
      return;
    }
    if (!this.id3Track) {
      this.id3Track = this.createTrack(this.media);
    }
    const dateTimeOffset = lastFragment.programDateTime / 1000 - lastFragment.start;
    const Cue = getCueClass();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const dateRange = dateRanges[id];
      const appendedDateRangeCues = dateRangeCuesAppended[id];
      const cues = (appendedDateRangeCues == null ? void 0 : appendedDateRangeCues.cues) || {};
      let durationKnown = (appendedDateRangeCues == null ? void 0 : appendedDateRangeCues.durationKnown) || false;
      const startTime = dateRangeDateToTimelineSeconds(dateRange.startDate, dateTimeOffset);
      let endTime = MAX_CUE_ENDTIME;
      const endDate = dateRange.endDate;
      if (endDate) {
        endTime = dateRangeDateToTimelineSeconds(endDate, dateTimeOffset);
        durationKnown = true;
      } else if (dateRange.endOnNext && !durationKnown) {
        const nextDateRangeWithSameClass = ids.reduce((filterMapArray, id) => {
          const candidate = dateRanges[id];
          if (candidate.class === dateRange.class && candidate.id !== id && candidate.startDate > dateRange.startDate) {
            filterMapArray.push(candidate);
          }
          return filterMapArray;
        }, []).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
        if (nextDateRangeWithSameClass) {
          endTime = dateRangeDateToTimelineSeconds(nextDateRangeWithSameClass.startDate, dateTimeOffset);
          durationKnown = true;
        }
      }
      const attributes = Object.keys(dateRange.attr);
      for (let j = 0; j < attributes.length; j++) {
        const key = attributes[j];
        if (!isDateRangeCueAttribute(key)) {
          continue;
        }
        const cue = cues[key];
        if (cue) {
          if (durationKnown && !appendedDateRangeCues.durationKnown) {
            cue.endTime = endTime;
          }
        } else if (Cue) {
          let data = dateRange.attr[key];
          if (isSCTE35Attribute(key)) {
            data = hexToArrayBuffer(data);
          }
          const _cue = createCueWithDataFields(Cue, startTime, endTime, {
            key,
            data
          }, MetadataSchema.dateRange);
          if (_cue) {
            _cue.id = id;
            this.id3Track.addCue(_cue);
            cues[key] = _cue;
          }
        }
      }
      dateRangeCuesAppended[id] = {
        cues,
        dateRange,
        durationKnown
      };
    }
  }
}

class LatencyController {
  constructor(hls) {
    this.hls = void 0;
    this.config = void 0;
    this.media = null;
    this.levelDetails = null;
    this.currentTime = 0;
    this.stallCount = 0;
    this._latency = null;
    this.timeupdateHandler = () => this.timeupdate();
    this.hls = hls;
    this.config = hls.config;
    this.registerListeners();
  }
  get latency() {
    return this._latency || 0;
  }
  get maxLatency() {
    const {
      config,
      levelDetails
    } = this;
    if (config.liveMaxLatencyDuration !== undefined) {
      return config.liveMaxLatencyDuration;
    }
    return levelDetails ? config.liveMaxLatencyDurationCount * levelDetails.targetduration : 0;
  }
  get targetLatency() {
    const {
      levelDetails
    } = this;
    if (levelDetails === null) {
      return null;
    }
    const {
      holdBack,
      partHoldBack,
      targetduration
    } = levelDetails;
    const {
      liveSyncDuration,
      liveSyncDurationCount,
      lowLatencyMode
    } = this.config;
    const userConfig = this.hls.userConfig;
    let targetLatency = lowLatencyMode ? partHoldBack || holdBack : holdBack;
    if (userConfig.liveSyncDuration || userConfig.liveSyncDurationCount || targetLatency === 0) {
      targetLatency = liveSyncDuration !== undefined ? liveSyncDuration : liveSyncDurationCount * targetduration;
    }
    const maxLiveSyncOnStallIncrease = targetduration;
    const liveSyncOnStallIncrease = 1.0;
    return targetLatency + Math.min(this.stallCount * liveSyncOnStallIncrease, maxLiveSyncOnStallIncrease);
  }
  get liveSyncPosition() {
    const liveEdge = this.estimateLiveEdge();
    const targetLatency = this.targetLatency;
    const levelDetails = this.levelDetails;
    if (liveEdge === null || targetLatency === null || levelDetails === null) {
      return null;
    }
    const edge = levelDetails.edge;
    const syncPosition = liveEdge - targetLatency - this.edgeStalled;
    const min = edge - levelDetails.totalduration;
    const max = edge - (this.config.lowLatencyMode && levelDetails.partTarget || levelDetails.targetduration);
    return Math.min(Math.max(min, syncPosition), max);
  }
  get drift() {
    const {
      levelDetails
    } = this;
    if (levelDetails === null) {
      return 1;
    }
    return levelDetails.drift;
  }
  get edgeStalled() {
    const {
      levelDetails
    } = this;
    if (levelDetails === null) {
      return 0;
    }
    const maxLevelUpdateAge = (this.config.lowLatencyMode && levelDetails.partTarget || levelDetails.targetduration) * 3;
    return Math.max(levelDetails.age - maxLevelUpdateAge, 0);
  }
  get forwardBufferLength() {
    const {
      media,
      levelDetails
    } = this;
    if (!media || !levelDetails) {
      return 0;
    }
    const bufferedRanges = media.buffered.length;
    return (bufferedRanges ? media.buffered.end(bufferedRanges - 1) : levelDetails.edge) - this.currentTime;
  }
  destroy() {
    this.unregisterListeners();
    this.onMediaDetaching();
    this.levelDetails = null;
    // @ts-ignore
    this.hls = this.timeupdateHandler = null;
  }
  registerListeners() {
    this.hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    this.hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    this.hls.on(Events.ERROR, this.onError, this);
  }
  unregisterListeners() {
    this.hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    this.hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    this.hls.off(Events.ERROR, this.onError, this);
  }
  onMediaAttached(event, data) {
    this.media = data.media;
    this.media.addEventListener('timeupdate', this.timeupdateHandler);
  }
  onMediaDetaching() {
    if (this.media) {
      this.media.removeEventListener('timeupdate', this.timeupdateHandler);
      this.media = null;
    }
  }
  onManifestLoading() {
    this.levelDetails = null;
    this._latency = null;
    this.stallCount = 0;
  }
  onLevelUpdated(event, {
    details
  }) {
    this.levelDetails = details;
    if (details.advanced) {
      this.timeupdate();
    }
    if (!details.live && this.media) {
      this.media.removeEventListener('timeupdate', this.timeupdateHandler);
    }
  }
  onError(event, data) {
    var _this$levelDetails;
    if (data.details !== ErrorDetails.BUFFER_STALLED_ERROR) {
      return;
    }
    this.stallCount++;
    if ((_this$levelDetails = this.levelDetails) != null && _this$levelDetails.live) {
      logger.warn('[playback-rate-controller]: Stall detected, adjusting target latency');
    }
  }
  timeupdate() {
    const {
      media,
      levelDetails
    } = this;
    if (!media || !levelDetails) {
      return;
    }
    this.currentTime = media.currentTime;
    const latency = this.computeLatency();
    if (latency === null) {
      return;
    }
    this._latency = latency;

    // Adapt playbackRate to meet target latency in low-latency mode
    const {
      lowLatencyMode,
      maxLiveSyncPlaybackRate
    } = this.config;
    if (!lowLatencyMode || maxLiveSyncPlaybackRate === 1) {
      return;
    }
    const targetLatency = this.targetLatency;
    if (targetLatency === null) {
      return;
    }
    const distanceFromTarget = latency - targetLatency;
    // Only adjust playbackRate when within one target duration of targetLatency
    // and more than one second from under-buffering.
    // Playback further than one target duration from target can be considered DVR playback.
    const liveMinLatencyDuration = Math.min(this.maxLatency, targetLatency + levelDetails.targetduration);
    const inLiveRange = distanceFromTarget < liveMinLatencyDuration;
    if (levelDetails.live && inLiveRange && distanceFromTarget > 0.05 && this.forwardBufferLength > 1) {
      const max = Math.min(2, Math.max(1.0, maxLiveSyncPlaybackRate));
      const rate = Math.round(2 / (1 + Math.exp(-0.75 * distanceFromTarget - this.edgeStalled)) * 20) / 20;
      media.playbackRate = Math.min(max, Math.max(1, rate));
    } else if (media.playbackRate !== 1 && media.playbackRate !== 0) {
      media.playbackRate = 1;
    }
  }
  estimateLiveEdge() {
    const {
      levelDetails
    } = this;
    if (levelDetails === null) {
      return null;
    }
    return levelDetails.edge + levelDetails.age;
  }
  computeLatency() {
    const liveEdge = this.estimateLiveEdge();
    if (liveEdge === null) {
      return null;
    }
    return liveEdge - this.currentTime;
  }
}

const HdcpLevels = ['NONE', 'TYPE-0', 'TYPE-1', null];
var HlsSkip = {
  No: "",
  Yes: "YES",
  v2: "v2"
};
function getSkipValue(details, msn) {
  const {
    canSkipUntil,
    canSkipDateRanges,
    endSN
  } = details;
  const snChangeGoal = msn !== undefined ? msn - endSN : 0;
  if (canSkipUntil && snChangeGoal < canSkipUntil) {
    if (canSkipDateRanges) {
      return HlsSkip.v2;
    }
    return HlsSkip.Yes;
  }
  return HlsSkip.No;
}
class HlsUrlParameters {
  constructor(msn, part, skip) {
    this.msn = void 0;
    this.part = void 0;
    this.skip = void 0;
    this.msn = msn;
    this.part = part;
    this.skip = skip;
  }
  addDirectives(uri) {
    const url = new self.URL(uri);
    if (this.msn !== undefined) {
      url.searchParams.set('_HLS_msn', this.msn.toString());
    }
    if (this.part !== undefined) {
      url.searchParams.set('_HLS_part', this.part.toString());
    }
    if (this.skip) {
      url.searchParams.set('_HLS_skip', this.skip);
    }
    return url.href;
  }
}
class Level {
  constructor(data) {
    this._attrs = void 0;
    this.audioCodec = void 0;
    this.bitrate = void 0;
    this.codecSet = void 0;
    this.height = void 0;
    this.id = void 0;
    this.name = void 0;
    this.videoCodec = void 0;
    this.width = void 0;
    this.unknownCodecs = void 0;
    this.audioGroupIds = void 0;
    this.details = void 0;
    this.fragmentError = 0;
    this.loadError = 0;
    this.loaded = void 0;
    this.realBitrate = 0;
    this.textGroupIds = void 0;
    this.url = void 0;
    this._urlId = 0;
    this.url = [data.url];
    this._attrs = [data.attrs];
    this.bitrate = data.bitrate;
    if (data.details) {
      this.details = data.details;
    }
    this.id = data.id || 0;
    this.name = data.name;
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.audioCodec = data.audioCodec;
    this.videoCodec = data.videoCodec;
    this.unknownCodecs = data.unknownCodecs;
    this.codecSet = [data.videoCodec, data.audioCodec].filter(c => c).join(',').replace(/\.[^.,]+/g, '');
  }
  get maxBitrate() {
    return Math.max(this.realBitrate, this.bitrate);
  }
  get attrs() {
    return this._attrs[this._urlId];
  }
  get pathwayId() {
    return this.attrs['PATHWAY-ID'] || '.';
  }
  get uri() {
    return this.url[this._urlId] || '';
  }
  get urlId() {
    return this._urlId;
  }
  set urlId(value) {
    const newValue = value % this.url.length;
    if (this._urlId !== newValue) {
      this.fragmentError = 0;
      this.loadError = 0;
      this.details = undefined;
      this._urlId = newValue;
    }
  }
  get audioGroupId() {
    var _this$audioGroupIds;
    return (_this$audioGroupIds = this.audioGroupIds) == null ? void 0 : _this$audioGroupIds[this.urlId];
  }
  get textGroupId() {
    var _this$textGroupIds;
    return (_this$textGroupIds = this.textGroupIds) == null ? void 0 : _this$textGroupIds[this.urlId];
  }
  addFallback(data) {
    this.url.push(data.url);
    this._attrs.push(data.attrs);
  }
}

function updateFromToPTS(fragFrom, fragTo) {
  const fragToPTS = fragTo.startPTS;
  // if we know startPTS[toIdx]
  if (isFiniteNumber(fragToPTS)) {
    // update fragment duration.
    // it helps to fix drifts between playlist reported duration and fragment real duration
    let duration = 0;
    let frag;
    if (fragTo.sn > fragFrom.sn) {
      duration = fragToPTS - fragFrom.start;
      frag = fragFrom;
    } else {
      duration = fragFrom.start - fragToPTS;
      frag = fragTo;
    }
    if (frag.duration !== duration) {
      frag.duration = duration;
    }
    // we dont know startPTS[toIdx]
  } else if (fragTo.sn > fragFrom.sn) {
    const contiguous = fragFrom.cc === fragTo.cc;
    // TODO: With part-loading end/durations we need to confirm the whole fragment is loaded before using (or setting) minEndPTS
    if (contiguous && fragFrom.minEndPTS) {
      fragTo.start = fragFrom.start + (fragFrom.minEndPTS - fragFrom.start);
    } else {
      fragTo.start = fragFrom.start + fragFrom.duration;
    }
  } else {
    fragTo.start = Math.max(fragFrom.start - fragTo.duration, 0);
  }
}
function updateFragPTSDTS(details, frag, startPTS, endPTS, startDTS, endDTS) {
  const parsedMediaDuration = endPTS - startPTS;
  if (parsedMediaDuration <= 0) {
    logger.warn('Fragment should have a positive duration', frag);
    endPTS = startPTS + frag.duration;
    endDTS = startDTS + frag.duration;
  }
  let maxStartPTS = startPTS;
  let minEndPTS = endPTS;
  const fragStartPts = frag.startPTS;
  const fragEndPts = frag.endPTS;
  if (isFiniteNumber(fragStartPts)) {
    // delta PTS between audio and video
    const deltaPTS = Math.abs(fragStartPts - startPTS);
    if (!isFiniteNumber(frag.deltaPTS)) {
      frag.deltaPTS = deltaPTS;
    } else {
      frag.deltaPTS = Math.max(deltaPTS, frag.deltaPTS);
    }
    maxStartPTS = Math.max(startPTS, fragStartPts);
    startPTS = Math.min(startPTS, fragStartPts);
    startDTS = Math.min(startDTS, frag.startDTS);
    minEndPTS = Math.min(endPTS, fragEndPts);
    endPTS = Math.max(endPTS, fragEndPts);
    endDTS = Math.max(endDTS, frag.endDTS);
  }
  const drift = startPTS - frag.start;
  if (frag.start !== 0) {
    frag.start = startPTS;
  }
  frag.duration = endPTS - frag.start;
  frag.startPTS = startPTS;
  frag.maxStartPTS = maxStartPTS;
  frag.startDTS = startDTS;
  frag.endPTS = endPTS;
  frag.minEndPTS = minEndPTS;
  frag.endDTS = endDTS;
  const sn = frag.sn; // 'initSegment'
  // exit if sn out of range
  if (!details || sn < details.startSN || sn > details.endSN) {
    return 0;
  }
  let i;
  const fragIdx = sn - details.startSN;
  const fragments = details.fragments;
  // update frag reference in fragments array
  // rationale is that fragments array might not contain this frag object.
  // this will happen if playlist has been refreshed between frag loading and call to updateFragPTSDTS()
  // if we don't update frag, we won't be able to propagate PTS info on the playlist
  // resulting in invalid sliding computation
  fragments[fragIdx] = frag;
  // adjust fragment PTS/duration from seqnum-1 to frag 0
  for (i = fragIdx; i > 0; i--) {
    updateFromToPTS(fragments[i], fragments[i - 1]);
  }

  // adjust fragment PTS/duration from seqnum to last frag
  for (i = fragIdx; i < fragments.length - 1; i++) {
    updateFromToPTS(fragments[i], fragments[i + 1]);
  }
  if (details.fragmentHint) {
    updateFromToPTS(fragments[fragments.length - 1], details.fragmentHint);
  }
  details.PTSKnown = details.alignedSliding = true;
  return drift;
}
function mergeDetails(oldDetails, newDetails) {
  // Track the last initSegment processed. Initialize it to the last one on the timeline.
  let currentInitSegment = null;
  const oldFragments = oldDetails.fragments;
  for (let i = oldFragments.length - 1; i >= 0; i--) {
    const oldInit = oldFragments[i].initSegment;
    if (oldInit) {
      currentInitSegment = oldInit;
      break;
    }
  }
  if (oldDetails.fragmentHint) {
    // prevent PTS and duration from being adjusted on the next hint
    delete oldDetails.fragmentHint.endPTS;
  }
  // check if old/new playlists have fragments in common
  // loop through overlapping SN and update startPTS , cc, and duration if any found
  let ccOffset = 0;
  let PTSFrag;
  mapFragmentIntersection(oldDetails, newDetails, (oldFrag, newFrag) => {
    if (oldFrag.relurl) {
      // Do not compare CC if the old fragment has no url. This is a level.fragmentHint used by LL-HLS parts.
      // It maybe be off by 1 if it was created before any parts or discontinuity tags were appended to the end
      // of the playlist.
      ccOffset = oldFrag.cc - newFrag.cc;
    }
    if (isFiniteNumber(oldFrag.startPTS) && isFiniteNumber(oldFrag.endPTS)) {
      newFrag.start = newFrag.startPTS = oldFrag.startPTS;
      newFrag.startDTS = oldFrag.startDTS;
      newFrag.maxStartPTS = oldFrag.maxStartPTS;
      newFrag.endPTS = oldFrag.endPTS;
      newFrag.endDTS = oldFrag.endDTS;
      newFrag.minEndPTS = oldFrag.minEndPTS;
      newFrag.duration = oldFrag.endPTS - oldFrag.startPTS;
      if (newFrag.duration) {
        PTSFrag = newFrag;
      }

      // PTS is known when any segment has startPTS and endPTS
      newDetails.PTSKnown = newDetails.alignedSliding = true;
    }
    newFrag.elementaryStreams = oldFrag.elementaryStreams;
    newFrag.loader = oldFrag.loader;
    newFrag.stats = oldFrag.stats;
    newFrag.urlId = oldFrag.urlId;
    if (oldFrag.initSegment) {
      newFrag.initSegment = oldFrag.initSegment;
      currentInitSegment = oldFrag.initSegment;
    }
  });
  if (currentInitSegment) {
    const fragmentsToCheck = newDetails.fragmentHint ? newDetails.fragments.concat(newDetails.fragmentHint) : newDetails.fragments;
    fragmentsToCheck.forEach(frag => {
      var _currentInitSegment;
      if (!frag.initSegment || frag.initSegment.relurl === ((_currentInitSegment = currentInitSegment) == null ? void 0 : _currentInitSegment.relurl)) {
        frag.initSegment = currentInitSegment;
      }
    });
  }
  if (newDetails.skippedSegments) {
    newDetails.deltaUpdateFailed = newDetails.fragments.some(frag => !frag);
    if (newDetails.deltaUpdateFailed) {
      logger.warn('[level-helper] Previous playlist missing segments skipped in delta playlist');
      for (let i = newDetails.skippedSegments; i--;) {
        newDetails.fragments.shift();
      }
      newDetails.startSN = newDetails.fragments[0].sn;
      newDetails.startCC = newDetails.fragments[0].cc;
    } else if (newDetails.canSkipDateRanges) {
      newDetails.dateRanges = mergeDateRanges(oldDetails.dateRanges, newDetails.dateRanges, newDetails.recentlyRemovedDateranges);
    }
  }
  const newFragments = newDetails.fragments;
  if (ccOffset) {
    logger.warn('discontinuity sliding from playlist, take drift into account');
    for (let i = 0; i < newFragments.length; i++) {
      newFragments[i].cc += ccOffset;
    }
  }
  if (newDetails.skippedSegments) {
    newDetails.startCC = newDetails.fragments[0].cc;
  }

  // Merge parts
  mapPartIntersection(oldDetails.partList, newDetails.partList, (oldPart, newPart) => {
    newPart.elementaryStreams = oldPart.elementaryStreams;
    newPart.stats = oldPart.stats;
  });

  // if at least one fragment contains PTS info, recompute PTS information for all fragments
  if (PTSFrag) {
    updateFragPTSDTS(newDetails, PTSFrag, PTSFrag.startPTS, PTSFrag.endPTS, PTSFrag.startDTS, PTSFrag.endDTS);
  } else {
    // ensure that delta is within oldFragments range
    // also adjust sliding in case delta is 0 (we could have old=[50-60] and new=old=[50-61])
    // in that case we also need to adjust start offset of all fragments
    adjustSliding(oldDetails, newDetails);
  }
  if (newFragments.length) {
    newDetails.totalduration = newDetails.edge - newFragments[0].start;
  }
  newDetails.driftStartTime = oldDetails.driftStartTime;
  newDetails.driftStart = oldDetails.driftStart;
  const advancedDateTime = newDetails.advancedDateTime;
  if (newDetails.advanced && advancedDateTime) {
    const edge = newDetails.edge;
    if (!newDetails.driftStart) {
      newDetails.driftStartTime = advancedDateTime;
      newDetails.driftStart = edge;
    }
    newDetails.driftEndTime = advancedDateTime;
    newDetails.driftEnd = edge;
  } else {
    newDetails.driftEndTime = oldDetails.driftEndTime;
    newDetails.driftEnd = oldDetails.driftEnd;
    newDetails.advancedDateTime = oldDetails.advancedDateTime;
  }
}
function mergeDateRanges(oldDateRanges, deltaDateRanges, recentlyRemovedDateranges) {
  const dateRanges = _extends({}, oldDateRanges);
  if (recentlyRemovedDateranges) {
    recentlyRemovedDateranges.forEach(id => {
      delete dateRanges[id];
    });
  }
  Object.keys(deltaDateRanges).forEach(id => {
    const dateRange = new DateRange(deltaDateRanges[id].attr, dateRanges[id]);
    if (dateRange.isValid) {
      dateRanges[id] = dateRange;
    } else {
      logger.warn(`Ignoring invalid Playlist Delta Update DATERANGE tag: "${JSON.stringify(deltaDateRanges[id].attr)}"`);
    }
  });
  return dateRanges;
}
function mapPartIntersection(oldParts, newParts, intersectionFn) {
  if (oldParts && newParts) {
    let delta = 0;
    for (let i = 0, len = oldParts.length; i <= len; i++) {
      const oldPart = oldParts[i];
      const newPart = newParts[i + delta];
      if (oldPart && newPart && oldPart.index === newPart.index && oldPart.fragment.sn === newPart.fragment.sn) {
        intersectionFn(oldPart, newPart);
      } else {
        delta--;
      }
    }
  }
}
function mapFragmentIntersection(oldDetails, newDetails, intersectionFn) {
  const skippedSegments = newDetails.skippedSegments;
  const start = Math.max(oldDetails.startSN, newDetails.startSN) - newDetails.startSN;
  const end = (oldDetails.fragmentHint ? 1 : 0) + (skippedSegments ? newDetails.endSN : Math.min(oldDetails.endSN, newDetails.endSN)) - newDetails.startSN;
  const delta = newDetails.startSN - oldDetails.startSN;
  const newFrags = newDetails.fragmentHint ? newDetails.fragments.concat(newDetails.fragmentHint) : newDetails.fragments;
  const oldFrags = oldDetails.fragmentHint ? oldDetails.fragments.concat(oldDetails.fragmentHint) : oldDetails.fragments;
  for (let i = start; i <= end; i++) {
    const oldFrag = oldFrags[delta + i];
    let newFrag = newFrags[i];
    if (skippedSegments && !newFrag && i < skippedSegments) {
      // Fill in skipped segments in delta playlist
      newFrag = newDetails.fragments[i] = oldFrag;
    }
    if (oldFrag && newFrag) {
      intersectionFn(oldFrag, newFrag);
    }
  }
}
function adjustSliding(oldDetails, newDetails) {
  const delta = newDetails.startSN + newDetails.skippedSegments - oldDetails.startSN;
  const oldFragments = oldDetails.fragments;
  if (delta < 0 || delta >= oldFragments.length) {
    return;
  }
  addSliding(newDetails, oldFragments[delta].start);
}
function addSliding(details, start) {
  if (start) {
    const fragments = details.fragments;
    for (let i = details.skippedSegments; i < fragments.length; i++) {
      fragments[i].start += start;
    }
    if (details.fragmentHint) {
      details.fragmentHint.start += start;
    }
  }
}
function computeReloadInterval(newDetails, distanceToLiveEdgeMs = Infinity) {
  let reloadInterval = 1000 * newDetails.targetduration;
  if (newDetails.updated) {
    // Use last segment duration when shorter than target duration and near live edge
    const fragments = newDetails.fragments;
    const liveEdgeMaxTargetDurations = 4;
    if (fragments.length && reloadInterval * liveEdgeMaxTargetDurations > distanceToLiveEdgeMs) {
      const lastSegmentDuration = fragments[fragments.length - 1].duration * 1000;
      if (lastSegmentDuration < reloadInterval) {
        reloadInterval = lastSegmentDuration;
      }
    }
  } else {
    // estimate = 'miss half average';
    // follow HLS Spec, If the client reloads a Playlist file and finds that it has not
    // changed then it MUST wait for a period of one-half the target
    // duration before retrying.
    reloadInterval /= 2;
  }
  return Math.round(reloadInterval);
}
function getFragmentWithSN(level, sn, fragCurrent) {
  if (!(level != null && level.details)) {
    return null;
  }
  const levelDetails = level.details;
  let fragment = levelDetails.fragments[sn - levelDetails.startSN];
  if (fragment) {
    return fragment;
  }
  fragment = levelDetails.fragmentHint;
  if (fragment && fragment.sn === sn) {
    return fragment;
  }
  if (sn < levelDetails.startSN && fragCurrent && fragCurrent.sn === sn) {
    return fragCurrent;
  }
  return null;
}
function getPartWith(level, sn, partIndex) {
  var _level$details;
  if (!(level != null && level.details)) {
    return null;
  }
  return findPart((_level$details = level.details) == null ? void 0 : _level$details.partList, sn, partIndex);
}
function findPart(partList, sn, partIndex) {
  if (partList) {
    for (let i = partList.length; i--;) {
      const part = partList[i];
      if (part.index === partIndex && part.fragment.sn === sn) {
        return part;
      }
    }
  }
  return null;
}

function isTimeoutError(error) {
  switch (error.details) {
    case ErrorDetails.FRAG_LOAD_TIMEOUT:
    case ErrorDetails.KEY_LOAD_TIMEOUT:
    case ErrorDetails.LEVEL_LOAD_TIMEOUT:
    case ErrorDetails.MANIFEST_LOAD_TIMEOUT:
      return true;
  }
  return false;
}
function getRetryConfig(loadPolicy, error) {
  const isTimeout = isTimeoutError(error);
  return loadPolicy.default[`${isTimeout ? 'timeout' : 'error'}Retry`];
}
function getRetryDelay(retryConfig, retryCount) {
  // exponential backoff capped to max retry delay
  const backoffFactor = retryConfig.backoff === 'linear' ? 1 : Math.pow(2, retryCount);
  return Math.min(backoffFactor * retryConfig.retryDelayMs, retryConfig.maxRetryDelayMs);
}
function getLoaderConfigWithoutReties(loderConfig) {
  return _objectSpread2(_objectSpread2({}, loderConfig), {
    errorRetry: null,
    timeoutRetry: null
  });
}
function shouldRetry(retryConfig, retryCount, isTimeout, httpStatus) {
  return !!retryConfig && retryCount < retryConfig.maxNumRetry && (retryForHttpStatus(httpStatus) || !!isTimeout);
}
function retryForHttpStatus(httpStatus) {
  // Do not retry on status 4xx, status 0 (CORS error), or undefined (decrypt/gap/parse error)
  return httpStatus === 0 && navigator.onLine === false || !!httpStatus && (httpStatus < 400 || httpStatus > 499);
}

const BinarySearch = {
  /**
   * Searches for an item in an array which matches a certain condition.
   * This requires the condition to only match one item in the array,
   * and for the array to be ordered.
   *
   * @param list The array to search.
   * @param comparisonFn
   *      Called and provided a candidate item as the first argument.
   *      Should return:
   *          > -1 if the item should be located at a lower index than the provided item.
   *          > 1 if the item should be located at a higher index than the provided item.
   *          > 0 if the item is the item you're looking for.
   *
   * @returns the object if found, otherwise returns null
   */
  search: function (list, comparisonFn) {
    let minIndex = 0;
    let maxIndex = list.length - 1;
    let currentIndex = null;
    let currentElement = null;
    while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = list[currentIndex];
      const comparisonResult = comparisonFn(currentElement);
      if (comparisonResult > 0) {
        minIndex = currentIndex + 1;
      } else if (comparisonResult < 0) {
        maxIndex = currentIndex - 1;
      } else {
        return currentElement;
      }
    }
    return null;
  }
};

/**
 * Returns first fragment whose endPdt value exceeds the given PDT, or null.
 * @param fragments - The array of candidate fragments
 * @param PDTValue - The PDT value which must be exceeded
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
 */
function findFragmentByPDT(fragments, PDTValue, maxFragLookUpTolerance) {
  if (PDTValue === null || !Array.isArray(fragments) || !fragments.length || !isFiniteNumber(PDTValue)) {
    return null;
  }

  // if less than start
  const startPDT = fragments[0].programDateTime;
  if (PDTValue < (startPDT || 0)) {
    return null;
  }
  const endPDT = fragments[fragments.length - 1].endProgramDateTime;
  if (PDTValue >= (endPDT || 0)) {
    return null;
  }
  maxFragLookUpTolerance = maxFragLookUpTolerance || 0;
  for (let seg = 0; seg < fragments.length; ++seg) {
    const frag = fragments[seg];
    if (pdtWithinToleranceTest(PDTValue, maxFragLookUpTolerance, frag)) {
      return frag;
    }
  }
  return null;
}

/**
 * Finds a fragment based on the SN of the previous fragment; or based on the needs of the current buffer.
 * This method compensates for small buffer gaps by applying a tolerance to the start of any candidate fragment, thus
 * breaking any traps which would cause the same fragment to be continuously selected within a small range.
 * @param fragPrevious - The last frag successfully appended
 * @param fragments - The array of candidate fragments
 * @param bufferEnd - The end of the contiguous buffered range the playhead is currently within
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
 * @returns a matching fragment or null
 */
function findFragmentByPTS(fragPrevious, fragments, bufferEnd = 0, maxFragLookUpTolerance = 0) {
  let fragNext = null;
  if (fragPrevious) {
    fragNext = fragments[fragPrevious.sn - fragments[0].sn + 1] || null;
  } else if (bufferEnd === 0 && fragments[0].start === 0) {
    fragNext = fragments[0];
  }
  // Prefer the next fragment if it's within tolerance
  if (fragNext && fragmentWithinToleranceTest(bufferEnd, maxFragLookUpTolerance, fragNext) === 0) {
    return fragNext;
  }
  // We might be seeking past the tolerance so find the best match
  const foundFragment = BinarySearch.search(fragments, fragmentWithinToleranceTest.bind(null, bufferEnd, maxFragLookUpTolerance));
  if (foundFragment && (foundFragment !== fragPrevious || !fragNext)) {
    return foundFragment;
  }
  // If no match was found return the next fragment after fragPrevious, or null
  return fragNext;
}

/**
 * The test function used by the findFragmentBySn's BinarySearch to look for the best match to the current buffer conditions.
 * @param candidate - The fragment to test
 * @param bufferEnd - The end of the current buffered range the playhead is currently within
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
 * @returns 0 if it matches, 1 if too low, -1 if too high
 */
function fragmentWithinToleranceTest(bufferEnd = 0, maxFragLookUpTolerance = 0, candidate) {
  // eagerly accept an accurate match (no tolerance)
  if (candidate.start <= bufferEnd && candidate.start + candidate.duration > bufferEnd) {
    return 0;
  }
  // offset should be within fragment boundary - config.maxFragLookUpTolerance
  // this is to cope with situations like
  // bufferEnd = 9.991
  // frag[Ø] : [0,10]
  // frag[1] : [10,20]
  // bufferEnd is within frag[0] range ... although what we are expecting is to return frag[1] here
  //              frag start               frag start+duration
  //                  |-----------------------------|
  //              <--->                         <--->
  //  ...--------><-----------------------------><---------....
  // previous frag         matching fragment         next frag
  //  return -1             return 0                 return 1
  // logger.log(`level/sn/start/end/bufEnd:${level}/${candidate.sn}/${candidate.start}/${(candidate.start+candidate.duration)}/${bufferEnd}`);
  // Set the lookup tolerance to be small enough to detect the current segment - ensures we don't skip over very small segments
  const candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0));
  if (candidate.start + candidate.duration - candidateLookupTolerance <= bufferEnd) {
    return 1;
  } else if (candidate.start - candidateLookupTolerance > bufferEnd && candidate.start) {
    // if maxFragLookUpTolerance will have negative value then don't return -1 for first element
    return -1;
  }
  return 0;
}

/**
 * The test function used by the findFragmentByPdt's BinarySearch to look for the best match to the current buffer conditions.
 * This function tests the candidate's program date time values, as represented in Unix time
 * @param candidate - The fragment to test
 * @param pdtBufferEnd - The Unix time representing the end of the current buffered range
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
 * @returns true if contiguous, false otherwise
 */
function pdtWithinToleranceTest(pdtBufferEnd, maxFragLookUpTolerance, candidate) {
  const candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0)) * 1000;

  // endProgramDateTime can be null, default to zero
  const endProgramDateTime = candidate.endProgramDateTime || 0;
  return endProgramDateTime - candidateLookupTolerance > pdtBufferEnd;
}
function findFragWithCC(fragments, cc) {
  return BinarySearch.search(fragments, candidate => {
    if (candidate.cc < cc) {
      return 1;
    } else if (candidate.cc > cc) {
      return -1;
    } else {
      return 0;
    }
  });
}

const RENDITION_PENALTY_DURATION_MS = 300000;
var NetworkErrorAction = {
  DoNothing: 0,
  SendEndCallback: 1,
  SendAlternateToPenaltyBox: 2,
  RemoveAlternatePermanently: 3,
  InsertDiscontinuity: 4,
  RetryRequest: 5
};
var ErrorActionFlags = {
  None: 0,
  MoveAllAlternatesMatchingHost: 1,
  MoveAllAlternatesMatchingHDCP: 2,
  SwitchToSDR: 4
}; // Reserved for future use
class ErrorController {
  constructor(hls) {
    this.hls = void 0;
    this.playlistError = 0;
    this.penalizedRenditions = {};
    this.log = void 0;
    this.warn = void 0;
    this.error = void 0;
    this.hls = hls;
    this.log = logger.log.bind(logger, `[info]:`);
    this.warn = logger.warn.bind(logger, `[warning]:`);
    this.error = logger.error.bind(logger, `[error]:`);
    this.registerListeners();
  }
  registerListeners() {
    const hls = this.hls;
    hls.on(Events.ERROR, this.onError, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
  }
  unregisterListeners() {
    const hls = this.hls;
    if (!hls) {
      return;
    }
    hls.off(Events.ERROR, this.onError, this);
    hls.off(Events.ERROR, this.onErrorOut, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
  }
  destroy() {
    this.unregisterListeners();
    // @ts-ignore
    this.hls = null;
    this.penalizedRenditions = {};
  }
  startLoad(startPosition) {
    this.playlistError = 0;
  }
  stopLoad() {}
  getVariantLevelIndex(frag) {
    return (frag == null ? void 0 : frag.type) === PlaylistLevelType.MAIN ? frag.level : this.hls.loadLevel;
  }
  onManifestLoading() {
    this.playlistError = 0;
    this.penalizedRenditions = {};
  }
  onLevelUpdated() {
    this.playlistError = 0;
  }
  onError(event, data) {
    var _data$frag, _data$level;
    if (data.fatal) {
      return;
    }
    const hls = this.hls;
    const context = data.context;
    switch (data.details) {
      case ErrorDetails.FRAG_LOAD_ERROR:
      case ErrorDetails.FRAG_LOAD_TIMEOUT:
      case ErrorDetails.KEY_LOAD_ERROR:
      case ErrorDetails.KEY_LOAD_TIMEOUT:
        data.errorAction = this.getFragRetryOrSwitchAction(data);
        return;
      case ErrorDetails.FRAG_PARSING_ERROR:
        // ignore empty segment errors marked as gap
        if ((_data$frag = data.frag) != null && _data$frag.gap) {
          data.errorAction = {
            action: NetworkErrorAction.DoNothing,
            flags: ErrorActionFlags.None
          };
          return;
        }
      // falls through
      case ErrorDetails.FRAG_GAP:
      case ErrorDetails.FRAG_DECRYPT_ERROR:
        {
          // Switch level if possible, otherwise allow retry count to reach max error retries
          data.errorAction = this.getFragRetryOrSwitchAction(data);
          data.errorAction.action = NetworkErrorAction.SendAlternateToPenaltyBox;
          return;
        }
      case ErrorDetails.LEVEL_EMPTY_ERROR:
      case ErrorDetails.LEVEL_PARSING_ERROR:
        {
          var _data$context, _data$context$levelDe;
          // Only retry when empty and live
          const levelIndex = data.parent === PlaylistLevelType.MAIN ? data.level : hls.loadLevel;
          if (data.details === ErrorDetails.LEVEL_EMPTY_ERROR && !!((_data$context = data.context) != null && (_data$context$levelDe = _data$context.levelDetails) != null && _data$context$levelDe.live)) {
            data.errorAction = this.getPlaylistRetryOrSwitchAction(data, levelIndex);
          } else {
            // Escalate to fatal if not retrying or switching
            data.levelRetry = false;
            data.errorAction = this.getLevelSwitchAction(data, levelIndex);
          }
        }
        return;
      case ErrorDetails.LEVEL_LOAD_ERROR:
      case ErrorDetails.LEVEL_LOAD_TIMEOUT:
        if (typeof (context == null ? void 0 : context.level) === 'number') {
          data.errorAction = this.getPlaylistRetryOrSwitchAction(data, context.level);
        }
        return;
      case ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
      case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
      case ErrorDetails.SUBTITLE_LOAD_ERROR:
      case ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT:
        if (context) {
          const level = hls.levels[hls.loadLevel];
          if (level && (context.type === PlaylistContextType.AUDIO_TRACK && context.groupId === level.audioGroupId || context.type === PlaylistContextType.SUBTITLE_TRACK && context.groupId === level.textGroupId)) {
            // Perform Pathway switch or Redundant failover if possible for fastest recovery
            // otherwise allow playlist retry count to reach max error retries
            data.errorAction = this.getPlaylistRetryOrSwitchAction(data, hls.loadLevel);
            data.errorAction.action = NetworkErrorAction.SendAlternateToPenaltyBox;
            data.errorAction.flags = ErrorActionFlags.MoveAllAlternatesMatchingHost;
            return;
          }
        }
        return;
      case ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED:
        {
          const level = hls.levels[hls.loadLevel];
          const restrictedHdcpLevel = level == null ? void 0 : level.attrs['HDCP-LEVEL'];
          if (restrictedHdcpLevel) {
            data.errorAction = {
              action: NetworkErrorAction.SendAlternateToPenaltyBox,
              flags: ErrorActionFlags.MoveAllAlternatesMatchingHDCP,
              hdcpLevel: restrictedHdcpLevel
            };
          }
        }
        return;
      case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
      case ErrorDetails.REMUX_ALLOC_ERROR:
        data.errorAction = this.getLevelSwitchAction(data, (_data$level = data.level) != null ? _data$level : hls.loadLevel);
        return;
      case ErrorDetails.INTERNAL_EXCEPTION:
      case ErrorDetails.BUFFER_APPENDING_ERROR:
      case ErrorDetails.BUFFER_APPEND_ERROR:
      case ErrorDetails.BUFFER_FULL_ERROR:
      case ErrorDetails.LEVEL_SWITCH_ERROR:
      case ErrorDetails.BUFFER_STALLED_ERROR:
      case ErrorDetails.BUFFER_SEEK_OVER_HOLE:
      case ErrorDetails.BUFFER_NUDGE_ON_STALL:
        data.errorAction = {
          action: NetworkErrorAction.DoNothing,
          flags: ErrorActionFlags.None
        };
        return;
    }
    if (data.type === ErrorTypes.KEY_SYSTEM_ERROR) {
      const levelIndex = this.getVariantLevelIndex(data.frag);
      // Do not retry level. Escalate to fatal if switching levels fails.
      data.levelRetry = false;
      data.errorAction = this.getLevelSwitchAction(data, levelIndex);
      return;
    }
  }
  getPlaylistRetryOrSwitchAction(data, levelIndex) {
    var _data$response;
    const hls = this.hls;
    const retryConfig = getRetryConfig(hls.config.playlistLoadPolicy, data);
    const retryCount = this.playlistError++;
    const httpStatus = (_data$response = data.response) == null ? void 0 : _data$response.code;
    const retry = shouldRetry(retryConfig, retryCount, isTimeoutError(data), httpStatus);
    if (retry) {
      return {
        action: NetworkErrorAction.RetryRequest,
        flags: ErrorActionFlags.None,
        retryConfig,
        retryCount
      };
    }
    const errorAction = this.getLevelSwitchAction(data, levelIndex);
    if (retryConfig) {
      errorAction.retryConfig = retryConfig;
      errorAction.retryCount = retryCount;
    }
    return errorAction;
  }
  getFragRetryOrSwitchAction(data) {
    const hls = this.hls;
    // Share fragment error count accross media options (main, audio, subs)
    // This allows for level based rendition switching when media option assets fail
    const variantLevelIndex = this.getVariantLevelIndex(data.frag);
    const level = hls.levels[variantLevelIndex];
    const {
      fragLoadPolicy,
      keyLoadPolicy
    } = hls.config;
    const retryConfig = getRetryConfig(data.details.startsWith('key') ? keyLoadPolicy : fragLoadPolicy, data);
    const fragmentErrors = hls.levels.reduce((acc, level) => acc + level.fragmentError, 0);
    // Switch levels when out of retried or level index out of bounds
    if (level) {
      var _data$response2;
      if (data.details !== ErrorDetails.FRAG_GAP) {
        level.fragmentError++;
      }
      const httpStatus = (_data$response2 = data.response) == null ? void 0 : _data$response2.code;
      const retry = shouldRetry(retryConfig, fragmentErrors, isTimeoutError(data), httpStatus);
      if (retry) {
        return {
          action: NetworkErrorAction.RetryRequest,
          flags: ErrorActionFlags.None,
          retryConfig,
          retryCount: fragmentErrors
        };
      }
    }
    // Reach max retry count, or Missing level reference
    // Switch to valid index
    const errorAction = this.getLevelSwitchAction(data, variantLevelIndex);
    // Add retry details to allow skipping of FRAG_PARSING_ERROR
    if (retryConfig) {
      errorAction.retryConfig = retryConfig;
      errorAction.retryCount = fragmentErrors;
    }
    return errorAction;
  }
  getLevelSwitchAction(data, levelIndex) {
    const hls = this.hls;
    if (levelIndex === null || levelIndex === undefined) {
      levelIndex = hls.loadLevel;
    }
    const level = this.hls.levels[levelIndex];
    if (level) {
      level.loadError++;
      if (hls.autoLevelEnabled) {
        var _data$frag2, _data$context2;
        // Search for next level to retry
        let nextLevel = -1;
        const {
          levels,
          loadLevel,
          minAutoLevel,
          maxAutoLevel
        } = hls;
        const fragErrorType = (_data$frag2 = data.frag) == null ? void 0 : _data$frag2.type;
        const {
          type: playlistErrorType,
          groupId: playlistErrorGroupId
        } = (_data$context2 = data.context) != null ? _data$context2 : {};
        for (let i = levels.length; i--;) {
          const candidate = (i + loadLevel) % levels.length;
          if (candidate !== loadLevel && candidate >= minAutoLevel && candidate <= maxAutoLevel && levels[candidate].loadError === 0) {
            const levelCandidate = levels[candidate];
            // Skip level switch if GAP tag is found in next level at same position
            if (data.details === ErrorDetails.FRAG_GAP && data.frag) {
              const levelDetails = levels[candidate].details;
              if (levelDetails) {
                const fragCandidate = findFragmentByPTS(data.frag, levelDetails.fragments, data.frag.start);
                if (fragCandidate != null && fragCandidate.gap) {
                  continue;
                }
              }
            } else if (playlistErrorType === PlaylistContextType.AUDIO_TRACK && playlistErrorGroupId === levelCandidate.audioGroupId || playlistErrorType === PlaylistContextType.SUBTITLE_TRACK && playlistErrorGroupId === levelCandidate.textGroupId) {
              // For audio/subs playlist errors find another group ID or fallthrough to redundant fail-over
              continue;
            } else if (fragErrorType === PlaylistLevelType.AUDIO && level.audioGroupId === levelCandidate.audioGroupId || fragErrorType === PlaylistLevelType.SUBTITLE && level.textGroupId === levelCandidate.textGroupId) {
              // For audio/subs frag errors find another group ID or fallthrough to redundant fail-over
              continue;
            }
            nextLevel = candidate;
            break;
          }
        }
        if (nextLevel > -1 && hls.loadLevel !== nextLevel) {
          data.levelRetry = true;
          this.playlistError = 0;
          return {
            action: NetworkErrorAction.SendAlternateToPenaltyBox,
            flags: ErrorActionFlags.None,
            nextAutoLevel: nextLevel
          };
        }
      }
    }
    // No levels to switch / Manual level selection / Level not found
    // Resolve with Pathway switch, Redundant fail-over, or stay on lowest Level
    return {
      action: NetworkErrorAction.SendAlternateToPenaltyBox,
      flags: ErrorActionFlags.MoveAllAlternatesMatchingHost
    };
  }
  onErrorOut(event, data) {
    var _data$errorAction;
    switch ((_data$errorAction = data.errorAction) == null ? void 0 : _data$errorAction.action) {
      case NetworkErrorAction.DoNothing:
        break;
      case NetworkErrorAction.SendAlternateToPenaltyBox:
        this.sendAlternateToPenaltyBox(data);
        if (!data.errorAction.resolved && data.details !== ErrorDetails.FRAG_GAP) {
          data.fatal = true;
        }
        break;
    }
    if (data.fatal) {
      this.hls.stopLoad();
      return;
    }
  }
  sendAlternateToPenaltyBox(data) {
    const hls = this.hls;
    const errorAction = data.errorAction;
    if (!errorAction) {
      return;
    }
    const {
      flags,
      hdcpLevel,
      nextAutoLevel
    } = errorAction;
    switch (flags) {
      case ErrorActionFlags.None:
        this.switchLevel(data, nextAutoLevel);
        break;
      case ErrorActionFlags.MoveAllAlternatesMatchingHost:
        {
          // Handle Redundant Levels here. Pathway switching is handled by content-steering-controller
          if (!errorAction.resolved) {
            errorAction.resolved = this.redundantFailover(data);
          }
        }
        break;
      case ErrorActionFlags.MoveAllAlternatesMatchingHDCP:
        if (hdcpLevel) {
          hls.maxHdcpLevel = HdcpLevels[HdcpLevels.indexOf(hdcpLevel) - 1];
          errorAction.resolved = true;
        }
        this.warn(`Restricting playback to HDCP-LEVEL of "${hls.maxHdcpLevel}" or lower`);
        break;
    }
    // If not resolved by previous actions try to switch to next level
    if (!errorAction.resolved) {
      this.switchLevel(data, nextAutoLevel);
    }
  }
  switchLevel(data, levelIndex) {
    if (levelIndex !== undefined && data.errorAction) {
      this.warn(`switching to level ${levelIndex} after ${data.details}`);
      this.hls.nextAutoLevel = levelIndex;
      data.errorAction.resolved = true;
      // Stream controller is responsible for this but won't switch on false start
      this.hls.nextLoadLevel = this.hls.nextAutoLevel;
    }
  }
  redundantFailover(data) {
    const {
      hls,
      penalizedRenditions
    } = this;
    const levelIndex = data.parent === PlaylistLevelType.MAIN ? data.level : hls.loadLevel;
    const level = hls.levels[levelIndex];
    const redundantLevels = level.url.length;
    const errorUrlId = data.frag ? data.frag.urlId : level.urlId;
    if (level.urlId === errorUrlId && (!data.frag || level.details)) {
      this.penalizeRendition(level, data);
    }
    for (let i = 1; i < redundantLevels; i++) {
      const newUrlId = (errorUrlId + i) % redundantLevels;
      const penalizedRendition = penalizedRenditions[newUrlId];
      // Check if rendition is penalized and skip if it is a bad fit for failover
      if (!penalizedRendition || checkExpired(penalizedRendition, data, penalizedRenditions[errorUrlId])) {
        // delete penalizedRenditions[newUrlId];
        // Update the url id of all levels so that we stay on the same set of variants when level switching
        this.warn(`Switching to Redundant Stream ${newUrlId + 1}/${redundantLevels}: "${level.url[newUrlId]}" after ${data.details}`);
        this.playlistError = 0;
        hls.levels.forEach(lv => {
          lv.urlId = newUrlId;
        });
        hls.nextLoadLevel = levelIndex;
        return true;
      }
    }
    return false;
  }
  penalizeRendition(level, data) {
    const {
      penalizedRenditions
    } = this;
    const penalizedRendition = penalizedRenditions[level.urlId] || {
      lastErrorPerfMs: 0,
      errors: [],
      details: undefined
    };
    penalizedRendition.lastErrorPerfMs = performance.now();
    penalizedRendition.errors.push(data);
    penalizedRendition.details = level.details;
    penalizedRenditions[level.urlId] = penalizedRendition;
  }
}
function checkExpired(penalizedRendition, data, currentPenaltyState) {
  // Expire penalty for switching back to rendition after RENDITION_PENALTY_DURATION_MS
  if (performance.now() - penalizedRendition.lastErrorPerfMs > RENDITION_PENALTY_DURATION_MS) {
    return true;
  }
  // Expire penalty on GAP tag error if rendition has no GAP at position (does not cover media tracks)
  const lastErrorDetails = penalizedRendition.details;
  if (data.details === ErrorDetails.FRAG_GAP && lastErrorDetails && data.frag) {
    const position = data.frag.start;
    const candidateFrag = findFragmentByPTS(null, lastErrorDetails.fragments, position);
    if (candidateFrag && !candidateFrag.gap) {
      return true;
    }
  }
  // Expire penalty if there are more errors in currentLevel than in penalizedRendition
  if (currentPenaltyState && penalizedRendition.errors.length < currentPenaltyState.errors.length) {
    const lastCandidateError = penalizedRendition.errors[penalizedRendition.errors.length - 1];
    if (lastErrorDetails && lastCandidateError.frag && data.frag && Math.abs(lastCandidateError.frag.start - data.frag.start) > lastErrorDetails.targetduration * 3) {
      return true;
    }
  }
  return false;
}

class BasePlaylistController {
  constructor(hls, logPrefix) {
    this.hls = void 0;
    this.timer = -1;
    this.requestScheduled = -1;
    this.canLoad = false;
    this.log = void 0;
    this.warn = void 0;
    this.log = logger.log.bind(logger, `${logPrefix}:`);
    this.warn = logger.warn.bind(logger, `${logPrefix}:`);
    this.hls = hls;
  }
  destroy() {
    this.clearTimer();
    // @ts-ignore
    this.hls = this.log = this.warn = null;
  }
  clearTimer() {
    clearTimeout(this.timer);
    this.timer = -1;
  }
  startLoad() {
    this.canLoad = true;
    this.requestScheduled = -1;
    this.loadPlaylist();
  }
  stopLoad() {
    this.canLoad = false;
    this.clearTimer();
  }
  switchParams(playlistUri, previous) {
    const renditionReports = previous == null ? void 0 : previous.renditionReports;
    if (renditionReports) {
      let foundIndex = -1;
      for (let i = 0; i < renditionReports.length; i++) {
        const attr = renditionReports[i];
        let uri;
        try {
          uri = new self.URL(attr.URI, previous.url).href;
        } catch (error) {
          logger.warn(`Could not construct new URL for Rendition Report: ${error}`);
          uri = attr.URI || '';
        }
        // Use exact match. Otherwise, the last partial match, if any, will be used
        // (Playlist URI includes a query string that the Rendition Report does not)
        if (uri === playlistUri) {
          foundIndex = i;
          break;
        } else if (uri === playlistUri.substring(0, uri.length)) {
          foundIndex = i;
        }
      }
      if (foundIndex !== -1) {
        const attr = renditionReports[foundIndex];
        const msn = parseInt(attr['LAST-MSN']) || (previous == null ? void 0 : previous.lastPartSn);
        let part = parseInt(attr['LAST-PART']) || (previous == null ? void 0 : previous.lastPartIndex);
        if (this.hls.config.lowLatencyMode) {
          const currentGoal = Math.min(previous.age - previous.partTarget, previous.targetduration);
          if (part >= 0 && currentGoal > previous.partTarget) {
            part += 1;
          }
        }
        return new HlsUrlParameters(msn, part >= 0 ? part : undefined, HlsSkip.No);
      }
    }
  }
  loadPlaylist(hlsUrlParameters) {
    if (this.requestScheduled === -1) {
      this.requestScheduled = self.performance.now();
    }
    // Loading is handled by the subclasses
  }

  shouldLoadPlaylist(playlist) {
    return this.canLoad && !!playlist && !!playlist.url && (!playlist.details || playlist.details.live);
  }
  shouldReloadPlaylist(playlist) {
    return this.timer === -1 && this.requestScheduled === -1 && this.shouldLoadPlaylist(playlist);
  }
  playlistLoaded(index, data, previousDetails) {
    const {
      details,
      stats
    } = data;

    // Set last updated date-time
    const now = self.performance.now();
    const elapsed = stats.loading.first ? Math.max(0, now - stats.loading.first) : 0;
    details.advancedDateTime = Date.now() - elapsed;

    // if current playlist is a live playlist, arm a timer to reload it
    if (details.live || previousDetails != null && previousDetails.live) {
      details.reloaded(previousDetails);
      if (previousDetails) {
        this.log(`live playlist ${index} ${details.advanced ? 'REFRESHED ' + details.lastPartSn + '-' + details.lastPartIndex : details.updated ? 'UPDATED' : 'MISSED'}`);
      }
      // Merge live playlists to adjust fragment starts and fill in delta playlist skipped segments
      if (previousDetails && details.fragments.length > 0) {
        mergeDetails(previousDetails, details);
      }
      if (!this.canLoad || !details.live) {
        return;
      }
      let deliveryDirectives;
      let msn = undefined;
      let part = undefined;
      if (details.canBlockReload && details.endSN && details.advanced) {
        // Load level with LL-HLS delivery directives
        const lowLatencyMode = this.hls.config.lowLatencyMode;
        const lastPartSn = details.lastPartSn;
        const endSn = details.endSN;
        const lastPartIndex = details.lastPartIndex;
        const hasParts = lastPartIndex !== -1;
        const lastPart = lastPartSn === endSn;
        // When low latency mode is disabled, we'll skip part requests once the last part index is found
        const nextSnStartIndex = lowLatencyMode ? 0 : lastPartIndex;
        if (hasParts) {
          msn = lastPart ? endSn + 1 : lastPartSn;
          part = lastPart ? nextSnStartIndex : lastPartIndex + 1;
        } else {
          msn = endSn + 1;
        }
        // Low-Latency CDN Tune-in: "age" header and time since load indicates we're behind by more than one part
        // Update directives to obtain the Playlist that has the estimated additional duration of media
        const lastAdvanced = details.age;
        const cdnAge = lastAdvanced + details.ageHeader;
        let currentGoal = Math.min(cdnAge - details.partTarget, details.targetduration * 1.5);
        if (currentGoal > 0) {
          if (previousDetails && currentGoal > previousDetails.tuneInGoal) {
            // If we attempted to get the next or latest playlist update, but currentGoal increased,
            // then we either can't catchup, or the "age" header cannot be trusted.
            this.warn(`CDN Tune-in goal increased from: ${previousDetails.tuneInGoal} to: ${currentGoal} with playlist age: ${details.age}`);
            currentGoal = 0;
          } else {
            const segments = Math.floor(currentGoal / details.targetduration);
            msn += segments;
            if (part !== undefined) {
              const parts = Math.round(currentGoal % details.targetduration / details.partTarget);
              part += parts;
            }
            this.log(`CDN Tune-in age: ${details.ageHeader}s last advanced ${lastAdvanced.toFixed(2)}s goal: ${currentGoal} skip sn ${segments} to part ${part}`);
          }
          details.tuneInGoal = currentGoal;
        }
        deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
        if (lowLatencyMode || !lastPart) {
          this.loadPlaylist(deliveryDirectives);
          return;
        }
      } else if (details.canBlockReload || details.canSkipUntil) {
        deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
      }
      const bufferInfo = this.hls.mainForwardBufferInfo;
      const position = bufferInfo ? bufferInfo.end - bufferInfo.len : 0;
      const distanceToLiveEdgeMs = (details.edge - position) * 1000;
      const reloadInterval = computeReloadInterval(details, distanceToLiveEdgeMs);
      if (details.updated && now > this.requestScheduled + reloadInterval) {
        this.requestScheduled = stats.loading.start;
      }
      if (msn !== undefined && details.canBlockReload) {
        this.requestScheduled = stats.loading.first + reloadInterval - (details.partTarget * 1000 || 1000);
      } else if (this.requestScheduled === -1 || this.requestScheduled + reloadInterval < now) {
        this.requestScheduled = now;
      } else if (this.requestScheduled - now <= 0) {
        this.requestScheduled += reloadInterval;
      }
      let estimatedTimeUntilUpdate = this.requestScheduled - now;
      estimatedTimeUntilUpdate = Math.max(0, estimatedTimeUntilUpdate);
      this.log(`reload live playlist ${index} in ${Math.round(estimatedTimeUntilUpdate)} ms`);
      // this.log(
      //   `live reload ${details.updated ? 'REFRESHED' : 'MISSED'}
      // reload in ${estimatedTimeUntilUpdate / 1000}
      // round trip ${(stats.loading.end - stats.loading.start) / 1000}
      // diff ${
      //   (reloadInterval -
      //     (estimatedTimeUntilUpdate +
      //       stats.loading.end -
      //       stats.loading.start)) /
      //   1000
      // }
      // reload interval ${reloadInterval / 1000}
      // target duration ${details.targetduration}
      // distance to edge ${distanceToLiveEdgeMs / 1000}`
      // );

      this.timer = self.setTimeout(() => this.loadPlaylist(deliveryDirectives), estimatedTimeUntilUpdate);
    } else {
      this.clearTimer();
    }
  }
  getDeliveryDirectives(details, previousDeliveryDirectives, msn, part) {
    let skip = getSkipValue(details, msn);
    if (previousDeliveryDirectives != null && previousDeliveryDirectives.skip && details.deltaUpdateFailed) {
      msn = previousDeliveryDirectives.msn;
      part = previousDeliveryDirectives.part;
      skip = HlsSkip.No;
    }
    return new HlsUrlParameters(msn, part, skip);
  }
  checkRetry(errorEvent) {
    const errorDetails = errorEvent.details;
    const isTimeout = isTimeoutError(errorEvent);
    const errorAction = errorEvent.errorAction;
    const {
      action,
      retryCount = 0,
      retryConfig
    } = errorAction || {};
    const retry = !!errorAction && !!retryConfig && (action === NetworkErrorAction.RetryRequest || !errorAction.resolved && action === NetworkErrorAction.SendAlternateToPenaltyBox);
    if (retry) {
      var _errorEvent$context;
      this.requestScheduled = -1;
      if (retryCount >= retryConfig.maxNumRetry) {
        return false;
      }
      if (isTimeout && (_errorEvent$context = errorEvent.context) != null && _errorEvent$context.deliveryDirectives) {
        // The LL-HLS request already timed out so retry immediately
        this.warn(`Retrying playlist loading ${retryCount + 1}/${retryConfig.maxNumRetry} after "${errorDetails}" without delivery-directives`);
        this.loadPlaylist();
      } else {
        const delay = getRetryDelay(retryConfig, retryCount);
        // Schedule level/track reload
        this.timer = self.setTimeout(() => this.loadPlaylist(), delay);
        this.warn(`Retrying playlist loading ${retryCount + 1}/${retryConfig.maxNumRetry} after "${errorDetails}" in ${delay}ms`);
      }
      // `levelRetry = true` used to inform other controllers that a retry is happening
      errorEvent.levelRetry = true;
      errorAction.resolved = true;
    }
    return retry;
  }
}

let chromeOrFirefox;
class LevelController extends BasePlaylistController {
  constructor(hls, contentSteeringController) {
    super(hls, '[level-controller]');
    this._levels = [];
    this._firstLevel = -1;
    this._startLevel = void 0;
    this.currentLevel = null;
    this.currentLevelIndex = -1;
    this.manualLevelIndex = -1;
    this.steering = void 0;
    this.onParsedComplete = void 0;
    this.steering = contentSteeringController;
    this._registerListeners();
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.on(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.off(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
  }
  destroy() {
    this._unregisterListeners();
    this.steering = null;
    this.resetLevels();
    super.destroy();
  }
  startLoad() {
    const levels = this._levels;

    // clean up live level details to force reload them, and reset load errors
    levels.forEach(level => {
      level.loadError = 0;
      level.fragmentError = 0;
    });
    super.startLoad();
  }
  resetLevels() {
    this._startLevel = undefined;
    this.manualLevelIndex = -1;
    this.currentLevelIndex = -1;
    this.currentLevel = null;
    this._levels = [];
  }
  onManifestLoading(event, data) {
    this.resetLevels();
  }
  onManifestLoaded(event, data) {
    const levels = [];
    const levelSet = {};
    let levelFromSet;

    // regroup redundant levels together
    data.levels.forEach(levelParsed => {
      var _levelParsed$audioCod;
      const attributes = levelParsed.attrs;

      // erase audio codec info if browser does not support mp4a.40.34.
      // demuxer will autodetect codec and fallback to mpeg/audio
      if (((_levelParsed$audioCod = levelParsed.audioCodec) == null ? void 0 : _levelParsed$audioCod.indexOf('mp4a.40.34')) !== -1) {
        chromeOrFirefox || (chromeOrFirefox = /chrome|firefox/i.test(navigator.userAgent));
        if (chromeOrFirefox) {
          levelParsed.audioCodec = undefined;
        }
      }
      const {
        AUDIO,
        CODECS,
        'FRAME-RATE': FRAMERATE,
        'PATHWAY-ID': PATHWAY,
        RESOLUTION,
        SUBTITLES
      } = attributes;
      const contentSteeringPrefix = `${PATHWAY || '.'}-` ;
      const levelKey = `${contentSteeringPrefix}${levelParsed.bitrate}-${RESOLUTION}-${FRAMERATE}-${CODECS}`;
      levelFromSet = levelSet[levelKey];
      if (!levelFromSet) {
        levelFromSet = new Level(levelParsed);
        levelSet[levelKey] = levelFromSet;
        levels.push(levelFromSet);
      } else {
        levelFromSet.addFallback(levelParsed);
      }
      addGroupId(levelFromSet, 'audio', AUDIO);
      addGroupId(levelFromSet, 'text', SUBTITLES);
    });
    this.filterAndSortMediaOptions(levels, data);
  }
  filterAndSortMediaOptions(unfilteredLevels, data) {
    let audioTracks = [];
    let subtitleTracks = [];
    let resolutionFound = false;
    let videoCodecFound = false;
    let audioCodecFound = false;

    // only keep levels with supported audio/video codecs
    let levels = unfilteredLevels.filter(({
      audioCodec,
      videoCodec,
      width,
      height,
      unknownCodecs
    }) => {
      resolutionFound || (resolutionFound = !!(width && height));
      videoCodecFound || (videoCodecFound = !!videoCodec);
      audioCodecFound || (audioCodecFound = !!audioCodec);
      return !(unknownCodecs != null && unknownCodecs.length) && (!audioCodec || isCodecSupportedInMp4(audioCodec, 'audio')) && (!videoCodec || isCodecSupportedInMp4(videoCodec, 'video'));
    });

    // remove audio-only level if we also have levels with video codecs or RESOLUTION signalled
    if ((resolutionFound || videoCodecFound) && audioCodecFound) {
      levels = levels.filter(({
        videoCodec,
        width,
        height
      }) => !!videoCodec || !!(width && height));
    }
    if (levels.length === 0) {
      // Dispatch error after MANIFEST_LOADED is done propagating
      Promise.resolve().then(() => {
        if (this.hls) {
          const error = new Error('no level with compatible codecs found in manifest');
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
            fatal: true,
            url: data.url,
            error,
            reason: error.message
          });
        }
      });
      return;
    }
    if (data.audioTracks) {
      audioTracks = data.audioTracks.filter(track => !track.audioCodec || isCodecSupportedInMp4(track.audioCodec, 'audio'));
      // Assign ids after filtering as array indices by group-id
      assignTrackIdsByGroup(audioTracks);
    }
    if (data.subtitles) {
      subtitleTracks = data.subtitles;
      assignTrackIdsByGroup(subtitleTracks);
    }
    // start bitrate is the first bitrate of the manifest
    const unsortedLevels = levels.slice(0);
    // sort levels from lowest to highest
    levels.sort((a, b) => {
      if (a.attrs['HDCP-LEVEL'] !== b.attrs['HDCP-LEVEL']) {
        return (a.attrs['HDCP-LEVEL'] || '') > (b.attrs['HDCP-LEVEL'] || '') ? 1 : -1;
      }
      if (a.bitrate !== b.bitrate) {
        return a.bitrate - b.bitrate;
      }
      if (a.attrs['FRAME-RATE'] !== b.attrs['FRAME-RATE']) {
        return a.attrs.decimalFloatingPoint('FRAME-RATE') - b.attrs.decimalFloatingPoint('FRAME-RATE');
      }
      if (a.attrs.SCORE !== b.attrs.SCORE) {
        return a.attrs.decimalFloatingPoint('SCORE') - b.attrs.decimalFloatingPoint('SCORE');
      }
      if (resolutionFound && a.height !== b.height) {
        return a.height - b.height;
      }
      return 0;
    });
    let firstLevelInPlaylist = unsortedLevels[0];
    if (this.steering) {
      levels = this.steering.filterParsedLevels(levels);
      if (levels.length !== unsortedLevels.length) {
        for (let i = 0; i < unsortedLevels.length; i++) {
          if (unsortedLevels[i].pathwayId === levels[0].pathwayId) {
            firstLevelInPlaylist = unsortedLevels[i];
            break;
          }
        }
      }
    }
    this._levels = levels;

    // find index of first level in sorted levels
    for (let i = 0; i < levels.length; i++) {
      if (levels[i] === firstLevelInPlaylist) {
        this._firstLevel = i;
        this.log(`manifest loaded, ${levels.length} level(s) found, first bitrate: ${firstLevelInPlaylist.bitrate}`);
        break;
      }
    }

    // Audio is only alternate if manifest include a URI along with the audio group tag,
    // and this is not an audio-only stream where levels contain audio-only
    const audioOnly = audioCodecFound && !videoCodecFound;
    const edata = {
      levels,
      audioTracks,
      subtitleTracks,
      sessionData: data.sessionData,
      sessionKeys: data.sessionKeys,
      firstLevel: this._firstLevel,
      stats: data.stats,
      audio: audioCodecFound,
      video: videoCodecFound,
      altAudio: !audioOnly && audioTracks.some(t => !!t.url)
    };
    this.hls.trigger(Events.MANIFEST_PARSED, edata);

    // Initiate loading after all controllers have received MANIFEST_PARSED
    if (this.hls.config.autoStartLoad || this.hls.forceStartLoad) {
      this.hls.startLoad(this.hls.config.startPosition);
    }
  }
  get levels() {
    if (this._levels.length === 0) {
      return null;
    }
    return this._levels;
  }
  get level() {
    return this.currentLevelIndex;
  }
  set level(newLevel) {
    const levels = this._levels;
    if (levels.length === 0) {
      return;
    }
    // check if level idx is valid
    if (newLevel < 0 || newLevel >= levels.length) {
      // invalid level id given, trigger error
      const error = new Error('invalid level idx');
      const fatal = newLevel < 0;
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.LEVEL_SWITCH_ERROR,
        level: newLevel,
        fatal,
        error,
        reason: error.message
      });
      if (fatal) {
        return;
      }
      newLevel = Math.min(newLevel, levels.length - 1);
    }
    const lastLevelIndex = this.currentLevelIndex;
    const lastLevel = this.currentLevel;
    const lastPathwayId = lastLevel ? lastLevel.attrs['PATHWAY-ID'] : undefined;
    const level = levels[newLevel];
    const pathwayId = level.attrs['PATHWAY-ID'];
    this.currentLevelIndex = newLevel;
    this.currentLevel = level;
    if (lastLevelIndex === newLevel && level.details && lastLevel && lastPathwayId === pathwayId) {
      return;
    }
    this.log(`Switching to level ${newLevel}${pathwayId ? ' with Pathway ' + pathwayId : ''} from level ${lastLevelIndex}${lastPathwayId ? ' with Pathway ' + lastPathwayId : ''}`);
    const levelSwitchingData = _extends({}, level, {
      level: newLevel,
      maxBitrate: level.maxBitrate,
      attrs: level.attrs,
      uri: level.uri,
      urlId: level.urlId
    });
    // @ts-ignore
    delete levelSwitchingData._attrs;
    // @ts-ignore
    delete levelSwitchingData._urlId;
    this.hls.trigger(Events.LEVEL_SWITCHING, levelSwitchingData);
    // check if we need to load playlist for this level
    const levelDetails = level.details;
    if (!levelDetails || levelDetails.live) {
      // level not retrieved yet, or live playlist we need to (re)load it
      const hlsUrlParameters = this.switchParams(level.uri, lastLevel == null ? void 0 : lastLevel.details);
      this.loadPlaylist(hlsUrlParameters);
    }
  }
  get manualLevel() {
    return this.manualLevelIndex;
  }
  set manualLevel(newLevel) {
    this.manualLevelIndex = newLevel;
    if (this._startLevel === undefined) {
      this._startLevel = newLevel;
    }
    if (newLevel !== -1) {
      this.level = newLevel;
    }
  }
  get firstLevel() {
    return this._firstLevel;
  }
  set firstLevel(newLevel) {
    this._firstLevel = newLevel;
  }
  get startLevel() {
    // hls.startLevel takes precedence over config.startLevel
    // if none of these values are defined, fallback on this._firstLevel (first quality level appearing in variant manifest)
    if (this._startLevel === undefined) {
      const configStartLevel = this.hls.config.startLevel;
      if (configStartLevel !== undefined) {
        return configStartLevel;
      } else {
        return this._firstLevel;
      }
    } else {
      return this._startLevel;
    }
  }
  set startLevel(newLevel) {
    this._startLevel = newLevel;
  }
  onError(event, data) {
    if (data.fatal || !data.context) {
      return;
    }
    if (data.context.type === PlaylistContextType.LEVEL && data.context.level === this.level) {
      this.checkRetry(data);
    }
  }

  // reset errors on the successful load of a fragment
  onFragLoaded(event, {
    frag
  }) {
    if (frag !== undefined && frag.type === PlaylistLevelType.MAIN) {
      const level = this._levels[frag.level];
      if (level !== undefined) {
        level.loadError = 0;
      }
    }
  }
  onLevelLoaded(event, data) {
    var _data$deliveryDirecti2;
    const {
      level,
      details
    } = data;
    const curLevel = this._levels[level];
    if (!curLevel) {
      var _data$deliveryDirecti;
      this.warn(`Invalid level index ${level}`);
      if ((_data$deliveryDirecti = data.deliveryDirectives) != null && _data$deliveryDirecti.skip) {
        details.deltaUpdateFailed = true;
      }
      return;
    }

    // only process level loaded events matching with expected level
    if (level === this.currentLevelIndex) {
      // reset level load error counter on successful level loaded only if there is no issues with fragments
      if (curLevel.fragmentError === 0) {
        curLevel.loadError = 0;
      }
      this.playlistLoaded(level, data, curLevel.details);
    } else if ((_data$deliveryDirecti2 = data.deliveryDirectives) != null && _data$deliveryDirecti2.skip) {
      // received a delta playlist update that cannot be merged
      details.deltaUpdateFailed = true;
    }
  }
  onAudioTrackSwitched(event, data) {
    const currentLevel = this.currentLevel;
    if (!currentLevel) {
      return;
    }
    const audioGroupId = this.hls.audioTracks[data.id].groupId;
    if (currentLevel.audioGroupIds && currentLevel.audioGroupId !== audioGroupId) {
      let urlId = -1;
      for (let i = 0; i < currentLevel.audioGroupIds.length; i++) {
        if (currentLevel.audioGroupIds[i] === audioGroupId) {
          urlId = i;
          break;
        }
      }
      if (urlId !== -1 && urlId !== currentLevel.urlId) {
        currentLevel.urlId = urlId;
        if (this.canLoad) {
          this.startLoad();
        }
      }
    }
  }
  loadPlaylist(hlsUrlParameters) {
    super.loadPlaylist();
    const currentLevelIndex = this.currentLevelIndex;
    const currentLevel = this.currentLevel;
    if (currentLevel && this.shouldLoadPlaylist(currentLevel)) {
      const id = currentLevel.urlId;
      let url = currentLevel.uri;
      if (hlsUrlParameters) {
        try {
          url = hlsUrlParameters.addDirectives(url);
        } catch (error) {
          this.warn(`Could not construct new URL with HLS Delivery Directives: ${error}`);
        }
      }
      const pathwayId = currentLevel.attrs['PATHWAY-ID'];
      this.log(`Loading level index ${currentLevelIndex}${(hlsUrlParameters == null ? void 0 : hlsUrlParameters.msn) !== undefined ? ' at sn ' + hlsUrlParameters.msn + ' part ' + hlsUrlParameters.part : ''} with${pathwayId ? ' Pathway ' + pathwayId : ''} URI ${id + 1}/${currentLevel.url.length} ${url}`);

      // console.log('Current audio track group ID:', this.hls.audioTracks[this.hls.audioTrack].groupId);
      // console.log('New video quality level audio group id:', levelObject.attrs.AUDIO, level);
      this.clearTimer();
      this.hls.trigger(Events.LEVEL_LOADING, {
        url,
        level: currentLevelIndex,
        id,
        deliveryDirectives: hlsUrlParameters || null
      });
    }
  }
  get nextLoadLevel() {
    if (this.manualLevelIndex !== -1) {
      return this.manualLevelIndex;
    } else {
      return this.hls.nextAutoLevel;
    }
  }
  set nextLoadLevel(nextLevel) {
    this.level = nextLevel;
    if (this.manualLevelIndex === -1) {
      this.hls.nextAutoLevel = nextLevel;
    }
  }
  removeLevel(levelIndex, urlId) {
    const filterLevelAndGroupByIdIndex = (url, id) => id !== urlId;
    const levels = this._levels.filter((level, index) => {
      if (index !== levelIndex) {
        return true;
      }
      if (level.url.length > 1 && urlId !== undefined) {
        level.url = level.url.filter(filterLevelAndGroupByIdIndex);
        if (level.audioGroupIds) {
          level.audioGroupIds = level.audioGroupIds.filter(filterLevelAndGroupByIdIndex);
        }
        if (level.textGroupIds) {
          level.textGroupIds = level.textGroupIds.filter(filterLevelAndGroupByIdIndex);
        }
        level.urlId = 0;
        return true;
      }
      if (this.steering) {
        this.steering.removeLevel(level);
      }
      return false;
    });
    this.hls.trigger(Events.LEVELS_UPDATED, {
      levels
    });
  }
  onLevelsUpdated(event, {
    levels
  }) {
    levels.forEach((level, index) => {
      const {
        details
      } = level;
      if (details != null && details.fragments) {
        details.fragments.forEach(fragment => {
          fragment.level = index;
        });
      }
    });
    this._levels = levels;
  }
}
function addGroupId(level, type, id) {
  if (!id) {
    return;
  }
  if (type === 'audio') {
    if (!level.audioGroupIds) {
      level.audioGroupIds = [];
    }
    level.audioGroupIds[level.url.length - 1] = id;
  } else if (type === 'text') {
    if (!level.textGroupIds) {
      level.textGroupIds = [];
    }
    level.textGroupIds[level.url.length - 1] = id;
  }
}
function assignTrackIdsByGroup(tracks) {
  const groups = {};
  tracks.forEach(track => {
    const groupId = track.groupId || '';
    track.id = groups[groupId] = groups[groupId] || 0;
    groups[groupId]++;
  });
}

var FragmentState = {
  NOT_LOADED: "NOT_LOADED",
  APPENDING: "APPENDING",
  PARTIAL: "PARTIAL",
  OK: "OK"
};
class FragmentTracker {
  constructor(hls) {
    this.activePartLists = Object.create(null);
    this.endListFragments = Object.create(null);
    this.fragments = Object.create(null);
    this.timeRanges = Object.create(null);
    this.bufferPadding = 0.2;
    this.hls = void 0;
    this.hasGaps = false;
    this.hls = hls;
    this._registerListeners();
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
  }
  destroy() {
    this._unregisterListeners();
    // @ts-ignore
    this.fragments =
    // @ts-ignore
    this.activePartLists =
    // @ts-ignore
    this.endListFragments = this.timeRanges = null;
  }

  /**
   * Return a Fragment or Part with an appended range that matches the position and levelType
   * Otherwise, return null
   */
  getAppendedFrag(position, levelType) {
    const activeParts = this.activePartLists[levelType];
    if (activeParts) {
      for (let i = activeParts.length; i--;) {
        const activePart = activeParts[i];
        if (!activePart) {
          break;
        }
        const appendedPTS = activePart.end;
        if (activePart.start <= position && appendedPTS !== null && position <= appendedPTS) {
          return activePart;
        }
      }
    }
    return this.getBufferedFrag(position, levelType);
  }

  /**
   * Return a buffered Fragment that matches the position and levelType.
   * A buffered Fragment is one whose loading, parsing and appending is done (completed or "partial" meaning aborted).
   * If not found any Fragment, return null
   */
  getBufferedFrag(position, levelType) {
    const {
      fragments
    } = this;
    const keys = Object.keys(fragments);
    for (let i = keys.length; i--;) {
      const fragmentEntity = fragments[keys[i]];
      if ((fragmentEntity == null ? void 0 : fragmentEntity.body.type) === levelType && fragmentEntity.buffered) {
        const frag = fragmentEntity.body;
        if (frag.start <= position && position <= frag.end) {
          return frag;
        }
      }
    }
    return null;
  }

  /**
   * Partial fragments effected by coded frame eviction will be removed
   * The browser will unload parts of the buffer to free up memory for new buffer data
   * Fragments will need to be reloaded when the buffer is freed up, removing partial fragments will allow them to reload(since there might be parts that are still playable)
   */
  detectEvictedFragments(elementaryStream, timeRange, playlistType, appendedPart) {
    if (this.timeRanges) {
      this.timeRanges[elementaryStream] = timeRange;
    }
    // Check if any flagged fragments have been unloaded
    // excluding anything newer than appendedPartSn
    const appendedPartSn = (appendedPart == null ? void 0 : appendedPart.fragment.sn) || -1;
    Object.keys(this.fragments).forEach(key => {
      const fragmentEntity = this.fragments[key];
      if (!fragmentEntity) {
        return;
      }
      if (appendedPartSn >= fragmentEntity.body.sn) {
        return;
      }
      if (!fragmentEntity.buffered && !fragmentEntity.loaded) {
        if (fragmentEntity.body.type === playlistType) {
          this.removeFragment(fragmentEntity.body);
        }
        return;
      }
      const esData = fragmentEntity.range[elementaryStream];
      if (!esData) {
        return;
      }
      esData.time.some(time => {
        const isNotBuffered = !this.isTimeBuffered(time.startPTS, time.endPTS, timeRange);
        if (isNotBuffered) {
          // Unregister partial fragment as it needs to load again to be reused
          this.removeFragment(fragmentEntity.body);
        }
        return isNotBuffered;
      });
    });
  }

  /**
   * Checks if the fragment passed in is loaded in the buffer properly
   * Partially loaded fragments will be registered as a partial fragment
   */
  detectPartialFragments(data) {
    const timeRanges = this.timeRanges;
    const {
      frag,
      part
    } = data;
    if (!timeRanges || frag.sn === 'initSegment') {
      return;
    }
    const fragKey = getFragmentKey(frag);
    const fragmentEntity = this.fragments[fragKey];
    if (!fragmentEntity || fragmentEntity.buffered && frag.gap) {
      return;
    }
    const isFragHint = !frag.relurl;
    Object.keys(timeRanges).forEach(elementaryStream => {
      const streamInfo = frag.elementaryStreams[elementaryStream];
      if (!streamInfo) {
        return;
      }
      const timeRange = timeRanges[elementaryStream];
      const partial = isFragHint || streamInfo.partial === true;
      fragmentEntity.range[elementaryStream] = this.getBufferedTimes(frag, part, partial, timeRange);
    });
    fragmentEntity.loaded = null;
    if (Object.keys(fragmentEntity.range).length) {
      fragmentEntity.buffered = true;
      const endList = fragmentEntity.body.endList = frag.endList || fragmentEntity.body.endList;
      if (endList) {
        this.endListFragments[fragmentEntity.body.type] = fragmentEntity;
      }
      if (!isPartial(fragmentEntity)) {
        // Remove older fragment parts from lookup after frag is tracked as buffered
        this.removeParts(frag.sn - 1, frag.type);
      }
    } else {
      // remove fragment if nothing was appended
      this.removeFragment(fragmentEntity.body);
    }
  }
  removeParts(snToKeep, levelType) {
    const activeParts = this.activePartLists[levelType];
    if (!activeParts) {
      return;
    }
    this.activePartLists[levelType] = activeParts.filter(part => part.fragment.sn >= snToKeep);
  }
  fragBuffered(frag, force) {
    const fragKey = getFragmentKey(frag);
    let fragmentEntity = this.fragments[fragKey];
    if (!fragmentEntity && force) {
      fragmentEntity = this.fragments[fragKey] = {
        body: frag,
        appendedPTS: null,
        loaded: null,
        buffered: false,
        range: Object.create(null)
      };
      if (frag.gap) {
        this.hasGaps = true;
      }
    }
    if (fragmentEntity) {
      fragmentEntity.loaded = null;
      fragmentEntity.buffered = true;
    }
  }
  getBufferedTimes(fragment, part, partial, timeRange) {
    const buffered = {
      time: [],
      partial
    };
    const startPTS = fragment.start;
    const endPTS = fragment.end;
    const minEndPTS = fragment.minEndPTS || endPTS;
    const maxStartPTS = fragment.maxStartPTS || startPTS;
    for (let i = 0; i < timeRange.length; i++) {
      const startTime = timeRange.start(i) - this.bufferPadding;
      const endTime = timeRange.end(i) + this.bufferPadding;
      if (maxStartPTS >= startTime && minEndPTS <= endTime) {
        // Fragment is entirely contained in buffer
        // No need to check the other timeRange times since it's completely playable
        buffered.time.push({
          startPTS: Math.max(startPTS, timeRange.start(i)),
          endPTS: Math.min(endPTS, timeRange.end(i))
        });
        break;
      } else if (startPTS < endTime && endPTS > startTime) {
        buffered.partial = true;
        // Check for intersection with buffer
        // Get playable sections of the fragment
        buffered.time.push({
          startPTS: Math.max(startPTS, timeRange.start(i)),
          endPTS: Math.min(endPTS, timeRange.end(i))
        });
      } else if (endPTS <= startTime) {
        // No need to check the rest of the timeRange as it is in order
        break;
      }
    }
    return buffered;
  }

  /**
   * Gets the partial fragment for a certain time
   */
  getPartialFragment(time) {
    let bestFragment = null;
    let timePadding;
    let startTime;
    let endTime;
    let bestOverlap = 0;
    const {
      bufferPadding,
      fragments
    } = this;
    Object.keys(fragments).forEach(key => {
      const fragmentEntity = fragments[key];
      if (!fragmentEntity) {
        return;
      }
      if (isPartial(fragmentEntity)) {
        startTime = fragmentEntity.body.start - bufferPadding;
        endTime = fragmentEntity.body.end + bufferPadding;
        if (time >= startTime && time <= endTime) {
          // Use the fragment that has the most padding from start and end time
          timePadding = Math.min(time - startTime, endTime - time);
          if (bestOverlap <= timePadding) {
            bestFragment = fragmentEntity.body;
            bestOverlap = timePadding;
          }
        }
      }
    });
    return bestFragment;
  }
  isEndListAppended(type) {
    const lastFragmentEntity = this.endListFragments[type];
    return lastFragmentEntity !== undefined && (lastFragmentEntity.buffered || isPartial(lastFragmentEntity));
  }
  getState(fragment) {
    const fragKey = getFragmentKey(fragment);
    const fragmentEntity = this.fragments[fragKey];
    if (fragmentEntity) {
      if (!fragmentEntity.buffered) {
        return FragmentState.APPENDING;
      } else if (isPartial(fragmentEntity)) {
        return FragmentState.PARTIAL;
      } else {
        return FragmentState.OK;
      }
    }
    return FragmentState.NOT_LOADED;
  }
  isTimeBuffered(startPTS, endPTS, timeRange) {
    let startTime;
    let endTime;
    for (let i = 0; i < timeRange.length; i++) {
      startTime = timeRange.start(i) - this.bufferPadding;
      endTime = timeRange.end(i) + this.bufferPadding;
      if (startPTS >= startTime && endPTS <= endTime) {
        return true;
      }
      if (endPTS <= startTime) {
        // No need to check the rest of the timeRange as it is in order
        return false;
      }
    }
    return false;
  }
  onFragLoaded(event, data) {
    const {
      frag,
      part
    } = data;
    // don't track initsegment (for which sn is not a number)
    // don't track frags used for bitrateTest, they're irrelevant.
    if (frag.sn === 'initSegment' || frag.bitrateTest) {
      return;
    }

    // Fragment entity `loaded` FragLoadedData is null when loading parts
    const loaded = part ? null : data;
    const fragKey = getFragmentKey(frag);
    this.fragments[fragKey] = {
      body: frag,
      appendedPTS: null,
      loaded,
      buffered: false,
      range: Object.create(null)
    };
  }
  onBufferAppended(event, data) {
    const {
      frag,
      part,
      timeRanges
    } = data;
    if (frag.sn === 'initSegment') {
      return;
    }
    const playlistType = frag.type;
    if (part) {
      let activeParts = this.activePartLists[playlistType];
      if (!activeParts) {
        this.activePartLists[playlistType] = activeParts = [];
      }
      activeParts.push(part);
    }
    // Store the latest timeRanges loaded in the buffer
    this.timeRanges = timeRanges;
    Object.keys(timeRanges).forEach(elementaryStream => {
      const timeRange = timeRanges[elementaryStream];
      this.detectEvictedFragments(elementaryStream, timeRange, playlistType, part);
    });
  }
  onFragBuffered(event, data) {
    this.detectPartialFragments(data);
  }
  hasFragment(fragment) {
    const fragKey = getFragmentKey(fragment);
    return !!this.fragments[fragKey];
  }
  hasParts(type) {
    var _this$activePartLists;
    return !!((_this$activePartLists = this.activePartLists[type]) != null && _this$activePartLists.length);
  }
  removeFragmentsInRange(start, end, playlistType, withGapOnly, unbufferedOnly) {
    if (withGapOnly && !this.hasGaps) {
      return;
    }
    Object.keys(this.fragments).forEach(key => {
      const fragmentEntity = this.fragments[key];
      if (!fragmentEntity) {
        return;
      }
      const frag = fragmentEntity.body;
      if (frag.type !== playlistType || withGapOnly && !frag.gap) {
        return;
      }
      if (frag.start < end && frag.end > start && (fragmentEntity.buffered || unbufferedOnly)) {
        this.removeFragment(frag);
      }
    });
  }
  removeFragment(fragment) {
    const fragKey = getFragmentKey(fragment);
    fragment.stats.loaded = 0;
    fragment.clearElementaryStreamInfo();
    const activeParts = this.activePartLists[fragment.type];
    if (activeParts) {
      const snToRemove = fragment.sn;
      this.activePartLists[fragment.type] = activeParts.filter(part => part.fragment.sn !== snToRemove);
    }
    delete this.fragments[fragKey];
    if (fragment.endList) {
      delete this.endListFragments[fragment.type];
    }
  }
  removeAllFragments() {
    this.fragments = Object.create(null);
    this.endListFragments = Object.create(null);
    this.activePartLists = Object.create(null);
    this.hasGaps = false;
  }
}
function isPartial(fragmentEntity) {
  var _fragmentEntity$range, _fragmentEntity$range2, _fragmentEntity$range3;
  return fragmentEntity.buffered && (fragmentEntity.body.gap || ((_fragmentEntity$range = fragmentEntity.range.video) == null ? void 0 : _fragmentEntity$range.partial) || ((_fragmentEntity$range2 = fragmentEntity.range.audio) == null ? void 0 : _fragmentEntity$range2.partial) || ((_fragmentEntity$range3 = fragmentEntity.range.audiovideo) == null ? void 0 : _fragmentEntity$range3.partial));
}
function getFragmentKey(fragment) {
  return `${fragment.type}_${fragment.level}_${fragment.urlId}_${fragment.sn}`;
}

const MIN_CHUNK_SIZE = Math.pow(2, 17); // 128kb

class FragmentLoader {
  constructor(config) {
    this.config = void 0;
    this.loader = null;
    this.partLoadTimeout = -1;
    this.config = config;
  }
  destroy() {
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
  }
  abort() {
    if (this.loader) {
      // Abort the loader for current fragment. Only one may load at any given time
      this.loader.abort();
    }
  }
  load(frag, onProgress) {
    const url = frag.url;
    if (!url) {
      return Promise.reject(new LoadError({
        type: ErrorTypes.NETWORK_ERROR,
        details: ErrorDetails.FRAG_LOAD_ERROR,
        fatal: false,
        frag,
        error: new Error(`Fragment does not have a ${url ? 'part list' : 'url'}`),
        networkDetails: null
      }));
    }
    this.abort();
    const config = this.config;
    const FragmentILoader = config.fLoader;
    const DefaultILoader = config.loader;
    return new Promise((resolve, reject) => {
      if (this.loader) {
        this.loader.destroy();
      }
      if (frag.gap) {
        if (frag.tagList.some(tags => tags[0] === 'GAP')) {
          reject(createGapLoadError(frag));
          return;
        } else {
          // Reset temporary treatment as GAP tag
          frag.gap = false;
        }
      }
      const loader = this.loader = frag.loader = FragmentILoader ? new FragmentILoader(config) : new DefaultILoader(config);
      const loaderContext = createLoaderContext(frag);
      const loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
      const loaderConfig = {
        loadPolicy,
        timeout: loadPolicy.maxLoadTimeMs,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: 0,
        highWaterMark: frag.sn === 'initSegment' ? Infinity : MIN_CHUNK_SIZE
      };
      // Assign frag stats to the loader's stats reference
      frag.stats = loader.stats;
      loader.load(loaderContext, loaderConfig, {
        onSuccess: (response, stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          let payload = response.data;
          if (context.resetIV && frag.decryptdata) {
            frag.decryptdata.iv = new Uint8Array(payload.slice(0, 16));
            payload = payload.slice(16);
          }
          resolve({
            frag,
            part: null,
            payload,
            networkDetails
          });
        },
        onError: (response, context, networkDetails, stats) => {
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.FRAG_LOAD_ERROR,
            fatal: false,
            frag,
            response: _objectSpread2({
              url,
              data: undefined
            }, response),
            error: new Error(`HTTP Error ${response.code} ${response.text}`),
            networkDetails,
            stats
          }));
        },
        onAbort: (stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.INTERNAL_ABORTED,
            fatal: false,
            frag,
            error: new Error('Aborted'),
            networkDetails,
            stats
          }));
        },
        onTimeout: (stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.FRAG_LOAD_TIMEOUT,
            fatal: false,
            frag,
            error: new Error(`Timeout after ${loaderConfig.timeout}ms`),
            networkDetails,
            stats
          }));
        },
        onProgress: (stats, context, data, networkDetails) => {
          if (onProgress) {
            onProgress({
              frag,
              part: null,
              payload: data,
              networkDetails
            });
          }
        }
      });
    });
  }
  loadPart(frag, part, onProgress) {
    this.abort();
    const config = this.config;
    const FragmentILoader = config.fLoader;
    const DefaultILoader = config.loader;
    return new Promise((resolve, reject) => {
      if (this.loader) {
        this.loader.destroy();
      }
      if (frag.gap || part.gap) {
        reject(createGapLoadError(frag, part));
        return;
      }
      const loader = this.loader = frag.loader = FragmentILoader ? new FragmentILoader(config) : new DefaultILoader(config);
      const loaderContext = createLoaderContext(frag, part);
      // Should we define another load policy for parts?
      const loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
      const loaderConfig = {
        loadPolicy,
        timeout: loadPolicy.maxLoadTimeMs,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: 0,
        highWaterMark: MIN_CHUNK_SIZE
      };
      // Assign part stats to the loader's stats reference
      part.stats = loader.stats;
      loader.load(loaderContext, loaderConfig, {
        onSuccess: (response, stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          this.updateStatsFromPart(frag, part);
          const partLoadedData = {
            frag,
            part,
            payload: response.data,
            networkDetails
          };
          onProgress(partLoadedData);
          resolve(partLoadedData);
        },
        onError: (response, context, networkDetails, stats) => {
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.FRAG_LOAD_ERROR,
            fatal: false,
            frag,
            part,
            response: _objectSpread2({
              url: loaderContext.url,
              data: undefined
            }, response),
            error: new Error(`HTTP Error ${response.code} ${response.text}`),
            networkDetails,
            stats
          }));
        },
        onAbort: (stats, context, networkDetails) => {
          frag.stats.aborted = part.stats.aborted;
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.INTERNAL_ABORTED,
            fatal: false,
            frag,
            part,
            error: new Error('Aborted'),
            networkDetails,
            stats
          }));
        },
        onTimeout: (stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(new LoadError({
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.FRAG_LOAD_TIMEOUT,
            fatal: false,
            frag,
            part,
            error: new Error(`Timeout after ${loaderConfig.timeout}ms`),
            networkDetails,
            stats
          }));
        }
      });
    });
  }
  updateStatsFromPart(frag, part) {
    const fragStats = frag.stats;
    const partStats = part.stats;
    const partTotal = partStats.total;
    fragStats.loaded += partStats.loaded;
    if (partTotal) {
      const estTotalParts = Math.round(frag.duration / part.duration);
      const estLoadedParts = Math.min(Math.round(fragStats.loaded / partTotal), estTotalParts);
      const estRemainingParts = estTotalParts - estLoadedParts;
      const estRemainingBytes = estRemainingParts * Math.round(fragStats.loaded / estLoadedParts);
      fragStats.total = fragStats.loaded + estRemainingBytes;
    } else {
      fragStats.total = Math.max(fragStats.loaded, fragStats.total);
    }
    const fragLoading = fragStats.loading;
    const partLoading = partStats.loading;
    if (fragLoading.start) {
      // add to fragment loader latency
      fragLoading.first += partLoading.first - partLoading.start;
    } else {
      fragLoading.start = partLoading.start;
      fragLoading.first = partLoading.first;
    }
    fragLoading.end = partLoading.end;
  }
  resetLoader(frag, loader) {
    frag.loader = null;
    if (this.loader === loader) {
      self.clearTimeout(this.partLoadTimeout);
      this.loader = null;
    }
    loader.destroy();
  }
}
function createLoaderContext(frag, part = null) {
  const segment = part || frag;
  const loaderContext = {
    frag,
    part,
    responseType: 'arraybuffer',
    url: segment.url,
    headers: {},
    rangeStart: 0,
    rangeEnd: 0
  };
  const start = segment.byteRangeStartOffset;
  const end = segment.byteRangeEndOffset;
  if (isFiniteNumber(start) && isFiniteNumber(end)) {
    var _frag$decryptdata;
    let byteRangeStart = start;
    let byteRangeEnd = end;
    if (frag.sn === 'initSegment' && ((_frag$decryptdata = frag.decryptdata) == null ? void 0 : _frag$decryptdata.method) === 'AES-128') {
      // MAP segment encrypted with method 'AES-128', when served with HTTP Range,
      // has the unencrypted size specified in the range.
      // Ref: https://tools.ietf.org/html/draft-pantos-hls-rfc8216bis-08#section-6.3.6
      const fragmentLen = end - start;
      if (fragmentLen % 16) {
        byteRangeEnd = end + (16 - fragmentLen % 16);
      }
      if (start !== 0) {
        loaderContext.resetIV = true;
        byteRangeStart = start - 16;
      }
    }
    loaderContext.rangeStart = byteRangeStart;
    loaderContext.rangeEnd = byteRangeEnd;
  }
  return loaderContext;
}
function createGapLoadError(frag, part) {
  const error = new Error(`GAP ${frag.gap ? 'tag' : 'attribute'} found`);
  const errorData = {
    type: ErrorTypes.MEDIA_ERROR,
    details: ErrorDetails.FRAG_GAP,
    fatal: false,
    frag,
    error,
    networkDetails: null
  };
  if (part) {
    errorData.part = part;
  }
  (part ? part : frag).stats.aborted = true;
  return new LoadError(errorData);
}
class LoadError extends Error {
  constructor(data) {
    super(data.error.message);
    this.data = void 0;
    this.data = data;
  }
}

class KeyLoader {
  constructor(config) {
    this.config = void 0;
    this.keyUriToKeyInfo = {};
    this.emeController = null;
    this.config = config;
  }
  abort(type) {
    for (const uri in this.keyUriToKeyInfo) {
      const loader = this.keyUriToKeyInfo[uri].loader;
      if (loader) {
        if (type && type !== loader.context.frag.type) {
          return;
        }
        loader.abort();
      }
    }
  }
  detach() {
    for (const uri in this.keyUriToKeyInfo) {
      const keyInfo = this.keyUriToKeyInfo[uri];
      // Remove cached EME keys on detach
      if (keyInfo.mediaKeySessionContext || keyInfo.decryptdata.isCommonEncryption) {
        delete this.keyUriToKeyInfo[uri];
      }
    }
  }
  destroy() {
    this.detach();
    for (const uri in this.keyUriToKeyInfo) {
      const loader = this.keyUriToKeyInfo[uri].loader;
      if (loader) {
        loader.destroy();
      }
    }
    this.keyUriToKeyInfo = {};
  }
  createKeyLoadError(frag, details = ErrorDetails.KEY_LOAD_ERROR, error, networkDetails, response) {
    return new LoadError({
      type: ErrorTypes.NETWORK_ERROR,
      details,
      fatal: false,
      frag,
      response,
      error,
      networkDetails
    });
  }
  loadClear(loadingFrag, encryptedFragments) {
    if (this.emeController && this.config.emeEnabled) {
      // access key-system with nearest key on start (loaidng frag is unencrypted)
      const {
        sn,
        cc
      } = loadingFrag;
      for (let i = 0; i < encryptedFragments.length; i++) {
        const frag = encryptedFragments[i];
        if (cc <= frag.cc && (sn === 'initSegment' || frag.sn === 'initSegment' || sn < frag.sn)) {
          this.emeController.selectKeySystemFormat(frag).then(keySystemFormat => {
            frag.setKeyFormat(keySystemFormat);
          });
          break;
        }
      }
    }
  }
  load(frag) {
    if (!frag.decryptdata && frag.encrypted && this.emeController) {
      // Multiple keys, but none selected, resolve in eme-controller
      return this.emeController.selectKeySystemFormat(frag).then(keySystemFormat => {
        return this.loadInternal(frag, keySystemFormat);
      });
    }
    return this.loadInternal(frag);
  }
  loadInternal(frag, keySystemFormat) {
    var _keyInfo, _keyInfo2;
    if (keySystemFormat) {
      frag.setKeyFormat(keySystemFormat);
    }
    const decryptdata = frag.decryptdata;
    if (!decryptdata) {
      const error = new Error(keySystemFormat ? `Expected frag.decryptdata to be defined after setting format ${keySystemFormat}` : 'Missing decryption data on fragment in onKeyLoading');
      return Promise.reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, error));
    }
    const uri = decryptdata.uri;
    if (!uri) {
      return Promise.reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, new Error(`Invalid key URI: "${uri}"`)));
    }
    let keyInfo = this.keyUriToKeyInfo[uri];
    if ((_keyInfo = keyInfo) != null && _keyInfo.decryptdata.key) {
      decryptdata.key = keyInfo.decryptdata.key;
      return Promise.resolve({
        frag,
        keyInfo
      });
    }
    // Return key load promise as long as it does not have a mediakey session with an unusable key status
    if ((_keyInfo2 = keyInfo) != null && _keyInfo2.keyLoadPromise) {
      var _keyInfo$mediaKeySess;
      switch ((_keyInfo$mediaKeySess = keyInfo.mediaKeySessionContext) == null ? void 0 : _keyInfo$mediaKeySess.keyStatus) {
        case undefined:
        case 'status-pending':
        case 'usable':
        case 'usable-in-future':
          return keyInfo.keyLoadPromise.then(keyLoadedData => {
            // Return the correct fragment with updated decryptdata key and loaded keyInfo
            decryptdata.key = keyLoadedData.keyInfo.decryptdata.key;
            return {
              frag,
              keyInfo
            };
          });
      }
      // If we have a key session and status and it is not pending or usable, continue
      // This will go back to the eme-controller for expired keys to get a new keyLoadPromise
    }

    // Load the key or return the loading promise
    keyInfo = this.keyUriToKeyInfo[uri] = {
      decryptdata,
      keyLoadPromise: null,
      loader: null,
      mediaKeySessionContext: null
    };
    switch (decryptdata.method) {
      case 'ISO-23001-7':
      case 'SAMPLE-AES':
      case 'SAMPLE-AES-CENC':
      case 'SAMPLE-AES-CTR':
        if (decryptdata.keyFormat === 'identity') {
          // loadKeyHTTP handles http(s) and data URLs
          return this.loadKeyHTTP(keyInfo, frag);
        }
        return this.loadKeyEME(keyInfo, frag);
      case 'AES-128':
        return this.loadKeyHTTP(keyInfo, frag);
      default:
        return Promise.reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, new Error(`Key supplied with unsupported METHOD: "${decryptdata.method}"`)));
    }
  }
  loadKeyEME(keyInfo, frag) {
    const keyLoadedData = {
      frag,
      keyInfo
    };
    if (this.emeController && this.config.emeEnabled) {
      const keySessionContextPromise = this.emeController.loadKey(keyLoadedData);
      if (keySessionContextPromise) {
        return (keyInfo.keyLoadPromise = keySessionContextPromise.then(keySessionContext => {
          keyInfo.mediaKeySessionContext = keySessionContext;
          return keyLoadedData;
        })).catch(error => {
          // Remove promise for license renewal or retry
          keyInfo.keyLoadPromise = null;
          throw error;
        });
      }
    }
    return Promise.resolve(keyLoadedData);
  }
  loadKeyHTTP(keyInfo, frag) {
    const config = this.config;
    const Loader = config.loader;
    const keyLoader = new Loader(config);
    frag.keyLoader = keyInfo.loader = keyLoader;
    return keyInfo.keyLoadPromise = new Promise((resolve, reject) => {
      const loaderContext = {
        keyInfo,
        frag,
        responseType: 'arraybuffer',
        url: keyInfo.decryptdata.uri
      };

      // maxRetry is 0 so that instead of retrying the same key on the same variant multiple times,
      // key-loader will trigger an error and rely on stream-controller to handle retry logic.
      // this will also align retry logic with fragment-loader
      const loadPolicy = config.keyLoadPolicy.default;
      const loaderConfig = {
        loadPolicy,
        timeout: loadPolicy.maxLoadTimeMs,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: 0
      };
      const loaderCallbacks = {
        onSuccess: (response, stats, context, networkDetails) => {
          const {
            frag,
            keyInfo,
            url: uri
          } = context;
          if (!frag.decryptdata || keyInfo !== this.keyUriToKeyInfo[uri]) {
            return reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, new Error('after key load, decryptdata unset or changed'), networkDetails));
          }
          keyInfo.decryptdata.key = frag.decryptdata.key = new Uint8Array(response.data);

          // detach fragment key loader on load success
          frag.keyLoader = null;
          keyInfo.loader = null;
          resolve({
            frag,
            keyInfo
          });
        },
        onError: (response, context, networkDetails, stats) => {
          this.resetLoader(context);
          reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, new Error(`HTTP Error ${response.code} loading key ${response.text}`), networkDetails, _objectSpread2({
            url: loaderContext.url,
            data: undefined
          }, response)));
        },
        onTimeout: (stats, context, networkDetails) => {
          this.resetLoader(context);
          reject(this.createKeyLoadError(frag, ErrorDetails.KEY_LOAD_TIMEOUT, new Error('key loading timed out'), networkDetails));
        },
        onAbort: (stats, context, networkDetails) => {
          this.resetLoader(context);
          reject(this.createKeyLoadError(frag, ErrorDetails.INTERNAL_ABORTED, new Error('key loading aborted'), networkDetails));
        }
      };
      keyLoader.load(loaderContext, loaderConfig, loaderCallbacks);
    });
  }
  resetLoader(context) {
    const {
      frag,
      keyInfo,
      url: uri
    } = context;
    const loader = keyInfo.loader;
    if (frag.keyLoader === loader) {
      frag.keyLoader = null;
      keyInfo.loader = null;
    }
    delete this.keyUriToKeyInfo[uri];
    if (loader) {
      loader.destroy();
    }
  }
}

/**
 * @ignore
 * Sub-class specialization of EventHandler base class.
 *
 * TaskLoop allows to schedule a task function being called (optionnaly repeatedly) on the main loop,
 * scheduled asynchroneously, avoiding recursive calls in the same tick.
 *
 * The task itself is implemented in `doTick`. It can be requested and called for single execution
 * using the `tick` method.
 *
 * It will be assured that the task execution method (`tick`) only gets called once per main loop "tick",
 * no matter how often it gets requested for execution. Execution in further ticks will be scheduled accordingly.
 *
 * If further execution requests have already been scheduled on the next tick, it can be checked with `hasNextTick`,
 * and cancelled with `clearNextTick`.
 *
 * The task can be scheduled as an interval repeatedly with a period as parameter (see `setInterval`, `clearInterval`).
 *
 * Sub-classes need to implement the `doTick` method which will effectively have the task execution routine.
 *
 * Further explanations:
 *
 * The baseclass has a `tick` method that will schedule the doTick call. It may be called synchroneously
 * only for a stack-depth of one. On re-entrant calls, sub-sequent calls are scheduled for next main loop ticks.
 *
 * When the task execution (`tick` method) is called in re-entrant way this is detected and
 * we are limiting the task execution per call stack to exactly one, but scheduling/post-poning further
 * task processing on the next main loop iteration (also known as "next tick" in the Node/JS runtime lingo).
 */
class TaskLoop {
  constructor() {
    this._boundTick = void 0;
    this._tickTimer = null;
    this._tickInterval = null;
    this._tickCallCount = 0;
    this._boundTick = this.tick.bind(this);
  }
  destroy() {
    this.onHandlerDestroying();
    this.onHandlerDestroyed();
  }
  onHandlerDestroying() {
    // clear all timers before unregistering from event bus
    this.clearNextTick();
    this.clearInterval();
  }
  onHandlerDestroyed() {}
  hasInterval() {
    return !!this._tickInterval;
  }
  hasNextTick() {
    return !!this._tickTimer;
  }

  /**
   * @param millis - Interval time (ms)
   * @eturns True when interval has been scheduled, false when already scheduled (no effect)
   */
  setInterval(millis) {
    if (!this._tickInterval) {
      this._tickCallCount = 0;
      this._tickInterval = self.setInterval(this._boundTick, millis);
      return true;
    }
    return false;
  }

  /**
   * @returns True when interval was cleared, false when none was set (no effect)
   */
  clearInterval() {
    if (this._tickInterval) {
      self.clearInterval(this._tickInterval);
      this._tickInterval = null;
      return true;
    }
    return false;
  }

  /**
   * @returns True when timeout was cleared, false when none was set (no effect)
   */
  clearNextTick() {
    if (this._tickTimer) {
      self.clearTimeout(this._tickTimer);
      this._tickTimer = null;
      return true;
    }
    return false;
  }

  /**
   * Will call the subclass doTick implementation in this main loop tick
   * or in the next one (via setTimeout(,0)) in case it has already been called
   * in this tick (in case this is a re-entrant call).
   */
  tick() {
    this._tickCallCount++;
    if (this._tickCallCount === 1) {
      this.doTick();
      // re-entrant call to tick from previous doTick call stack
      // -> schedule a call on the next main loop iteration to process this task processing request
      if (this._tickCallCount > 1) {
        // make sure only one timer exists at any time at max
        this.tickImmediate();
      }
      this._tickCallCount = 0;
    }
  }
  tickImmediate() {
    this.clearNextTick();
    this._tickTimer = self.setTimeout(this._boundTick, 0);
  }

  /**
   * For subclass to implement task logic
   * @abstract
   */
  doTick() {}
}

/**
 * Provides methods dealing with buffer length retrieval for example.
 *
 * In general, a helper around HTML5 MediaElement TimeRanges gathered from `buffered` property.
 *
 * Also @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
 */

const noopBuffered = {
  length: 0,
  start: () => 0,
  end: () => 0
};
class BufferHelper {
  /**
   * Return true if `media`'s buffered include `position`
   */
  static isBuffered(media, position) {
    try {
      if (media) {
        const buffered = BufferHelper.getBuffered(media);
        for (let i = 0; i < buffered.length; i++) {
          if (position >= buffered.start(i) && position <= buffered.end(i)) {
            return true;
          }
        }
      }
    } catch (error) {
      // this is to catch
      // InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer':
      // This SourceBuffer has been removed from the parent media source
    }
    return false;
  }
  static bufferInfo(media, pos, maxHoleDuration) {
    try {
      if (media) {
        const vbuffered = BufferHelper.getBuffered(media);
        const buffered = [];
        let i;
        for (i = 0; i < vbuffered.length; i++) {
          buffered.push({
            start: vbuffered.start(i),
            end: vbuffered.end(i)
          });
        }
        return this.bufferedInfo(buffered, pos, maxHoleDuration);
      }
    } catch (error) {
      // this is to catch
      // InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer':
      // This SourceBuffer has been removed from the parent media source
    }
    return {
      len: 0,
      start: pos,
      end: pos,
      nextStart: undefined
    };
  }
  static bufferedInfo(buffered, pos, maxHoleDuration) {
    pos = Math.max(0, pos);
    // sort on buffer.start/smaller end (IE does not always return sorted buffered range)
    buffered.sort(function (a, b) {
      const diff = a.start - b.start;
      if (diff) {
        return diff;
      } else {
        return b.end - a.end;
      }
    });
    let buffered2 = [];
    if (maxHoleDuration) {
      // there might be some small holes between buffer time range
      // consider that holes smaller than maxHoleDuration are irrelevant and build another
      // buffer time range representations that discards those holes
      for (let i = 0; i < buffered.length; i++) {
        const buf2len = buffered2.length;
        if (buf2len) {
          const buf2end = buffered2[buf2len - 1].end;
          // if small hole (value between 0 or maxHoleDuration ) or overlapping (negative)
          if (buffered[i].start - buf2end < maxHoleDuration) {
            // merge overlapping time ranges
            // update lastRange.end only if smaller than item.end
            // e.g.  [ 1, 15] with  [ 2,8] => [ 1,15] (no need to modify lastRange.end)
            // whereas [ 1, 8] with  [ 2,15] => [ 1,15] ( lastRange should switch from [1,8] to [1,15])
            if (buffered[i].end > buf2end) {
              buffered2[buf2len - 1].end = buffered[i].end;
            }
          } else {
            // big hole
            buffered2.push(buffered[i]);
          }
        } else {
          // first value
          buffered2.push(buffered[i]);
        }
      }
    } else {
      buffered2 = buffered;
    }
    let bufferLen = 0;

    // bufferStartNext can possibly be undefined based on the conditional logic below
    let bufferStartNext;

    // bufferStart and bufferEnd are buffer boundaries around current video position
    let bufferStart = pos;
    let bufferEnd = pos;
    for (let i = 0; i < buffered2.length; i++) {
      const start = buffered2[i].start;
      const end = buffered2[i].end;
      // logger.log('buf start/end:' + buffered.start(i) + '/' + buffered.end(i));
      if (pos + maxHoleDuration >= start && pos < end) {
        // play position is inside this buffer TimeRange, retrieve end of buffer position and buffer length
        bufferStart = start;
        bufferEnd = end;
        bufferLen = bufferEnd - pos;
      } else if (pos + maxHoleDuration < start) {
        bufferStartNext = start;
        break;
      }
    }
    return {
      len: bufferLen,
      start: bufferStart || 0,
      end: bufferEnd || 0,
      nextStart: bufferStartNext
    };
  }

  /**
   * Safe method to get buffered property.
   * SourceBuffer.buffered may throw if SourceBuffer is removed from it's MediaSource
   */
  static getBuffered(media) {
    try {
      return media.buffered;
    } catch (e) {
      logger.log('failed to get media.buffered', e);
      return noopBuffered;
    }
  }
}

class ChunkMetadata {
  constructor(level, sn, id, size = 0, part = -1, partial = false) {
    this.level = void 0;
    this.sn = void 0;
    this.part = void 0;
    this.id = void 0;
    this.size = void 0;
    this.partial = void 0;
    this.transmuxing = getNewPerformanceTiming();
    this.buffering = {
      audio: getNewPerformanceTiming(),
      video: getNewPerformanceTiming(),
      audiovideo: getNewPerformanceTiming()
    };
    this.level = level;
    this.sn = sn;
    this.id = id;
    this.size = size;
    this.part = part;
    this.partial = partial;
  }
}
function getNewPerformanceTiming() {
  return {
    start: 0,
    executeStart: 0,
    executeEnd: 0,
    end: 0
  };
}

function findFirstFragWithCC(fragments, cc) {
  let firstFrag = null;
  for (let i = 0, len = fragments.length; i < len; i++) {
    const currentFrag = fragments[i];
    if (currentFrag && currentFrag.cc === cc) {
      firstFrag = currentFrag;
      break;
    }
  }
  return firstFrag;
}
function shouldAlignOnDiscontinuities(lastFrag, lastLevel, details) {
  if (lastLevel.details) {
    if (details.endCC > details.startCC || lastFrag && lastFrag.cc < details.startCC) {
      return true;
    }
  }
  return false;
}

// Find the first frag in the previous level which matches the CC of the first frag of the new level
function findDiscontinuousReferenceFrag(prevDetails, curDetails, referenceIndex = 0) {
  const prevFrags = prevDetails.fragments;
  const curFrags = curDetails.fragments;
  if (!curFrags.length || !prevFrags.length) {
    logger.log('No fragments to align');
    return;
  }
  const prevStartFrag = findFirstFragWithCC(prevFrags, curFrags[0].cc);
  if (!prevStartFrag || prevStartFrag && !prevStartFrag.startPTS) {
    logger.log('No frag in previous level to align on');
    return;
  }
  return prevStartFrag;
}
function adjustFragmentStart(frag, sliding) {
  if (frag) {
    const start = frag.start + sliding;
    frag.start = frag.startPTS = start;
    frag.endPTS = start + frag.duration;
  }
}
function adjustSlidingStart(sliding, details) {
  // Update segments
  const fragments = details.fragments;
  for (let i = 0, len = fragments.length; i < len; i++) {
    adjustFragmentStart(fragments[i], sliding);
  }
  // Update LL-HLS parts at the end of the playlist
  if (details.fragmentHint) {
    adjustFragmentStart(details.fragmentHint, sliding);
  }
  details.alignedSliding = true;
}

/**
 * Using the parameters of the last level, this function computes PTS' of the new fragments so that they form a
 * contiguous stream with the last fragments.
 * The PTS of a fragment lets Hls.js know where it fits into a stream - by knowing every PTS, we know which fragment to
 * download at any given time. PTS is normally computed when the fragment is demuxed, so taking this step saves us time
 * and an extra download.
 * @param lastFrag
 * @param lastLevel
 * @param details
 */
function alignStream(lastFrag, lastLevel, details) {
  if (!lastLevel) {
    return;
  }
  alignDiscontinuities(lastFrag, details, lastLevel);
  if (!details.alignedSliding && lastLevel.details) {
    // If the PTS wasn't figured out via discontinuity sequence that means there was no CC increase within the level.
    // Aligning via Program Date Time should therefore be reliable, since PDT should be the same within the same
    // discontinuity sequence.
    alignPDT(details, lastLevel.details);
  }
  if (!details.alignedSliding && lastLevel.details && !details.skippedSegments) {
    // Try to align on sn so that we pick a better start fragment.
    // Do not perform this on playlists with delta updates as this is only to align levels on switch
    // and adjustSliding only adjusts fragments after skippedSegments.
    adjustSliding(lastLevel.details, details);
  }
}

/**
 * Computes the PTS if a new level's fragments using the PTS of a fragment in the last level which shares the same
 * discontinuity sequence.
 * @param lastFrag - The last Fragment which shares the same discontinuity sequence
 * @param lastLevel - The details of the last loaded level
 * @param details - The details of the new level
 */
function alignDiscontinuities(lastFrag, details, lastLevel) {
  if (shouldAlignOnDiscontinuities(lastFrag, lastLevel, details)) {
    const referenceFrag = findDiscontinuousReferenceFrag(lastLevel.details, details);
    if (referenceFrag && isFiniteNumber(referenceFrag.start)) {
      logger.log(`Adjusting PTS using last level due to CC increase within current level ${details.url}`);
      adjustSlidingStart(referenceFrag.start, details);
    }
  }
}

/**
 * Computes the PTS of a new level's fragments using the difference in Program Date Time from the last level.
 * @param details - The details of the new level
 * @param lastDetails - The details of the last loaded level
 */
function alignPDT(details, lastDetails) {
  // This check protects the unsafe "!" usage below for null program date time access.
  if (!lastDetails.fragments.length || !details.hasProgramDateTime || !lastDetails.hasProgramDateTime) {
    return;
  }
  // if last level sliding is 1000 and its first frag PROGRAM-DATE-TIME is 2017-08-20 1:10:00 AM
  // and if new details first frag PROGRAM DATE-TIME is 2017-08-20 1:10:08 AM
  // then we can deduce that playlist B sliding is 1000+8 = 1008s
  const lastPDT = lastDetails.fragments[0].programDateTime; // hasProgramDateTime check above makes this safe.
  const newPDT = details.fragments[0].programDateTime;
  // date diff is in ms. frag.start is in seconds
  const sliding = (newPDT - lastPDT) / 1000 + lastDetails.fragments[0].start;
  if (sliding && isFiniteNumber(sliding)) {
    logger.log(`Adjusting PTS using programDateTime delta ${newPDT - lastPDT}ms, sliding:${sliding.toFixed(3)} ${details.url} `);
    adjustSlidingStart(sliding, details);
  }
}

/**
 * Ensures appropriate time-alignment between renditions based on PDT. Unlike `alignPDT`, which adjusts
 * the timeline based on the delta between PDTs of the 0th fragment of two playlists/`LevelDetails`,
 * this function assumes the timelines represented in `refDetails` are accurate, including the PDTs,
 * and uses the "wallclock"/PDT timeline as a cross-reference to `details`, adjusting the presentation
 * times/timelines of `details` accordingly.
 * Given the asynchronous nature of fetches and initial loads of live `main` and audio/subtitle tracks,
 * the primary purpose of this function is to ensure the "local timelines" of audio/subtitle tracks
 * are aligned to the main/video timeline, using PDT as the cross-reference/"anchor" that should
 * be consistent across playlists, per the HLS spec.
 * @param details - The details of the rendition you'd like to time-align (e.g. an audio rendition).
 * @param refDetails - The details of the reference rendition with start and PDT times for alignment.
 */
function alignMediaPlaylistByPDT(details, refDetails) {
  if (!details.hasProgramDateTime || !refDetails.hasProgramDateTime) {
    return;
  }
  const fragments = details.fragments;
  const refFragments = refDetails.fragments;
  if (!fragments.length || !refFragments.length) {
    return;
  }

  // Calculate a delta to apply to all fragments according to the delta in PDT times and start times
  // of a fragment in the reference details, and a fragment in the target details of the same discontinuity.
  // If a fragment of the same discontinuity was not found use the middle fragment of both.
  const middleFrag = Math.round(refFragments.length / 2) - 1;
  const refFrag = refFragments[middleFrag];
  const frag = findFirstFragWithCC(fragments, refFrag.cc) || fragments[Math.round(fragments.length / 2) - 1];
  const refPDT = refFrag.programDateTime;
  const targetPDT = frag.programDateTime;
  if (refPDT === null || targetPDT === null) {
    return;
  }
  const delta = (targetPDT - refPDT) / 1000 - (frag.start - refFrag.start);
  adjustSlidingStart(delta, details);
}

class AESCrypto {
  constructor(subtle, iv) {
    this.subtle = void 0;
    this.aesIV = void 0;
    this.subtle = subtle;
    this.aesIV = iv;
  }
  decrypt(data, key) {
    return this.subtle.decrypt({
      name: 'AES-CBC',
      iv: this.aesIV
    }, key, data);
  }
}

class FastAESKey {
  constructor(subtle, key) {
    this.subtle = void 0;
    this.key = void 0;
    this.subtle = subtle;
    this.key = key;
  }
  expandKey() {
    return this.subtle.importKey('raw', this.key, {
      name: 'AES-CBC'
    }, false, ['encrypt', 'decrypt']);
  }
}

// PKCS7
function removePadding(array) {
  const outputBytes = array.byteLength;
  const paddingBytes = outputBytes && new DataView(array.buffer).getUint8(outputBytes - 1);
  if (paddingBytes) {
    return sliceUint8(array, 0, outputBytes - paddingBytes);
  }
  return array;
}
class AESDecryptor {
  constructor() {
    this.rcon = [0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
    this.subMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    this.invSubMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    this.sBox = new Uint32Array(256);
    this.invSBox = new Uint32Array(256);
    this.key = new Uint32Array(0);
    this.ksRows = 0;
    this.keySize = 0;
    this.keySchedule = void 0;
    this.invKeySchedule = void 0;
    this.initTable();
  }

  // Using view.getUint32() also swaps the byte order.
  uint8ArrayToUint32Array_(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const newArray = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      newArray[i] = view.getUint32(i * 4);
    }
    return newArray;
  }
  initTable() {
    const sBox = this.sBox;
    const invSBox = this.invSBox;
    const subMix = this.subMix;
    const subMix0 = subMix[0];
    const subMix1 = subMix[1];
    const subMix2 = subMix[2];
    const subMix3 = subMix[3];
    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];
    const d = new Uint32Array(256);
    let x = 0;
    let xi = 0;
    let i = 0;
    for (i = 0; i < 256; i++) {
      if (i < 128) {
        d[i] = i << 1;
      } else {
        d[i] = i << 1 ^ 0x11b;
      }
    }
    for (i = 0; i < 256; i++) {
      let sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
      sx = sx >>> 8 ^ sx & 0xff ^ 0x63;
      sBox[x] = sx;
      invSBox[sx] = x;

      // Compute multiplication
      const x2 = d[x];
      const x4 = d[x2];
      const x8 = d[x4];

      // Compute sub/invSub bytes, mix columns tables
      let t = d[sx] * 0x101 ^ sx * 0x1010100;
      subMix0[x] = t << 24 | t >>> 8;
      subMix1[x] = t << 16 | t >>> 16;
      subMix2[x] = t << 8 | t >>> 24;
      subMix3[x] = t;

      // Compute inv sub bytes, inv mix columns tables
      t = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
      invSubMix0[sx] = t << 24 | t >>> 8;
      invSubMix1[sx] = t << 16 | t >>> 16;
      invSubMix2[sx] = t << 8 | t >>> 24;
      invSubMix3[sx] = t;

      // Compute next counter
      if (!x) {
        x = xi = 1;
      } else {
        x = x2 ^ d[d[d[x8 ^ x2]]];
        xi ^= d[d[xi]];
      }
    }
  }
  expandKey(keyBuffer) {
    // convert keyBuffer to Uint32Array
    const key = this.uint8ArrayToUint32Array_(keyBuffer);
    let sameKey = true;
    let offset = 0;
    while (offset < key.length && sameKey) {
      sameKey = key[offset] === this.key[offset];
      offset++;
    }
    if (sameKey) {
      return;
    }
    this.key = key;
    const keySize = this.keySize = key.length;
    if (keySize !== 4 && keySize !== 6 && keySize !== 8) {
      throw new Error('Invalid aes key size=' + keySize);
    }
    const ksRows = this.ksRows = (keySize + 6 + 1) * 4;
    let ksRow;
    let invKsRow;
    const keySchedule = this.keySchedule = new Uint32Array(ksRows);
    const invKeySchedule = this.invKeySchedule = new Uint32Array(ksRows);
    const sbox = this.sBox;
    const rcon = this.rcon;
    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];
    let prev;
    let t;
    for (ksRow = 0; ksRow < ksRows; ksRow++) {
      if (ksRow < keySize) {
        prev = keySchedule[ksRow] = key[ksRow];
        continue;
      }
      t = prev;
      if (ksRow % keySize === 0) {
        // Rot word
        t = t << 8 | t >>> 24;

        // Sub word
        t = sbox[t >>> 24] << 24 | sbox[t >>> 16 & 0xff] << 16 | sbox[t >>> 8 & 0xff] << 8 | sbox[t & 0xff];

        // Mix Rcon
        t ^= rcon[ksRow / keySize | 0] << 24;
      } else if (keySize > 6 && ksRow % keySize === 4) {
        // Sub word
        t = sbox[t >>> 24] << 24 | sbox[t >>> 16 & 0xff] << 16 | sbox[t >>> 8 & 0xff] << 8 | sbox[t & 0xff];
      }
      keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0;
    }
    for (invKsRow = 0; invKsRow < ksRows; invKsRow++) {
      ksRow = ksRows - invKsRow;
      if (invKsRow & 3) {
        t = keySchedule[ksRow];
      } else {
        t = keySchedule[ksRow - 4];
      }
      if (invKsRow < 4 || ksRow <= 4) {
        invKeySchedule[invKsRow] = t;
      } else {
        invKeySchedule[invKsRow] = invSubMix0[sbox[t >>> 24]] ^ invSubMix1[sbox[t >>> 16 & 0xff]] ^ invSubMix2[sbox[t >>> 8 & 0xff]] ^ invSubMix3[sbox[t & 0xff]];
      }
      invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0;
    }
  }

  // Adding this as a method greatly improves performance.
  networkToHostOrderSwap(word) {
    return word << 24 | (word & 0xff00) << 8 | (word & 0xff0000) >> 8 | word >>> 24;
  }
  decrypt(inputArrayBuffer, offset, aesIV) {
    const nRounds = this.keySize + 6;
    const invKeySchedule = this.invKeySchedule;
    const invSBOX = this.invSBox;
    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];
    const initVector = this.uint8ArrayToUint32Array_(aesIV);
    let initVector0 = initVector[0];
    let initVector1 = initVector[1];
    let initVector2 = initVector[2];
    let initVector3 = initVector[3];
    const inputInt32 = new Int32Array(inputArrayBuffer);
    const outputInt32 = new Int32Array(inputInt32.length);
    let t0, t1, t2, t3;
    let s0, s1, s2, s3;
    let inputWords0, inputWords1, inputWords2, inputWords3;
    let ksRow, i;
    const swapWord = this.networkToHostOrderSwap;
    while (offset < inputInt32.length) {
      inputWords0 = swapWord(inputInt32[offset]);
      inputWords1 = swapWord(inputInt32[offset + 1]);
      inputWords2 = swapWord(inputInt32[offset + 2]);
      inputWords3 = swapWord(inputInt32[offset + 3]);
      s0 = inputWords0 ^ invKeySchedule[0];
      s1 = inputWords3 ^ invKeySchedule[1];
      s2 = inputWords2 ^ invKeySchedule[2];
      s3 = inputWords1 ^ invKeySchedule[3];
      ksRow = 4;

      // Iterate through the rounds of decryption
      for (i = 1; i < nRounds; i++) {
        t0 = invSubMix0[s0 >>> 24] ^ invSubMix1[s1 >> 16 & 0xff] ^ invSubMix2[s2 >> 8 & 0xff] ^ invSubMix3[s3 & 0xff] ^ invKeySchedule[ksRow];
        t1 = invSubMix0[s1 >>> 24] ^ invSubMix1[s2 >> 16 & 0xff] ^ invSubMix2[s3 >> 8 & 0xff] ^ invSubMix3[s0 & 0xff] ^ invKeySchedule[ksRow + 1];
        t2 = invSubMix0[s2 >>> 24] ^ invSubMix1[s3 >> 16 & 0xff] ^ invSubMix2[s0 >> 8 & 0xff] ^ invSubMix3[s1 & 0xff] ^ invKeySchedule[ksRow + 2];
        t3 = invSubMix0[s3 >>> 24] ^ invSubMix1[s0 >> 16 & 0xff] ^ invSubMix2[s1 >> 8 & 0xff] ^ invSubMix3[s2 & 0xff] ^ invKeySchedule[ksRow + 3];
        // Update state
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;
        ksRow = ksRow + 4;
      }

      // Shift rows, sub bytes, add round key
      t0 = invSBOX[s0 >>> 24] << 24 ^ invSBOX[s1 >> 16 & 0xff] << 16 ^ invSBOX[s2 >> 8 & 0xff] << 8 ^ invSBOX[s3 & 0xff] ^ invKeySchedule[ksRow];
      t1 = invSBOX[s1 >>> 24] << 24 ^ invSBOX[s2 >> 16 & 0xff] << 16 ^ invSBOX[s3 >> 8 & 0xff] << 8 ^ invSBOX[s0 & 0xff] ^ invKeySchedule[ksRow + 1];
      t2 = invSBOX[s2 >>> 24] << 24 ^ invSBOX[s3 >> 16 & 0xff] << 16 ^ invSBOX[s0 >> 8 & 0xff] << 8 ^ invSBOX[s1 & 0xff] ^ invKeySchedule[ksRow + 2];
      t3 = invSBOX[s3 >>> 24] << 24 ^ invSBOX[s0 >> 16 & 0xff] << 16 ^ invSBOX[s1 >> 8 & 0xff] << 8 ^ invSBOX[s2 & 0xff] ^ invKeySchedule[ksRow + 3];

      // Write
      outputInt32[offset] = swapWord(t0 ^ initVector0);
      outputInt32[offset + 1] = swapWord(t3 ^ initVector1);
      outputInt32[offset + 2] = swapWord(t2 ^ initVector2);
      outputInt32[offset + 3] = swapWord(t1 ^ initVector3);

      // reset initVector to last 4 unsigned int
      initVector0 = inputWords0;
      initVector1 = inputWords1;
      initVector2 = inputWords2;
      initVector3 = inputWords3;
      offset = offset + 4;
    }
    return outputInt32.buffer;
  }
}

const CHUNK_SIZE = 16; // 16 bytes, 128 bits

class Decrypter {
  constructor(config, {
    removePKCS7Padding = true
  } = {}) {
    this.logEnabled = true;
    this.removePKCS7Padding = void 0;
    this.subtle = null;
    this.softwareDecrypter = null;
    this.key = null;
    this.fastAesKey = null;
    this.remainderData = null;
    this.currentIV = null;
    this.currentResult = null;
    this.useSoftware = void 0;
    this.useSoftware = config.enableSoftwareAES;
    this.removePKCS7Padding = removePKCS7Padding;
    // built in decryptor expects PKCS7 padding
    if (removePKCS7Padding) {
      try {
        const browserCrypto = self.crypto;
        if (browserCrypto) {
          this.subtle = browserCrypto.subtle || browserCrypto.webkitSubtle;
        }
      } catch (e) {
        /* no-op */
      }
    }
    if (this.subtle === null) {
      this.useSoftware = true;
    }
  }
  destroy() {
    this.subtle = null;
    this.softwareDecrypter = null;
    this.key = null;
    this.fastAesKey = null;
    this.remainderData = null;
    this.currentIV = null;
    this.currentResult = null;
  }
  isSync() {
    return this.useSoftware;
  }
  flush() {
    const {
      currentResult,
      remainderData
    } = this;
    if (!currentResult || remainderData) {
      this.reset();
      return null;
    }
    const data = new Uint8Array(currentResult);
    this.reset();
    if (this.removePKCS7Padding) {
      return removePadding(data);
    }
    return data;
  }
  reset() {
    this.currentResult = null;
    this.currentIV = null;
    this.remainderData = null;
    if (this.softwareDecrypter) {
      this.softwareDecrypter = null;
    }
  }
  decrypt(data, key, iv) {
    if (this.useSoftware) {
      return new Promise((resolve, reject) => {
        this.softwareDecrypt(new Uint8Array(data), key, iv);
        const decryptResult = this.flush();
        if (decryptResult) {
          resolve(decryptResult.buffer);
        } else {
          reject(new Error('[softwareDecrypt] Failed to decrypt data'));
        }
      });
    }
    return this.webCryptoDecrypt(new Uint8Array(data), key, iv);
  }

  // Software decryption is progressive. Progressive decryption may not return a result on each call. Any cached
  // data is handled in the flush() call
  softwareDecrypt(data, key, iv) {
    const {
      currentIV,
      currentResult,
      remainderData
    } = this;
    this.logOnce('JS AES decrypt');
    // The output is staggered during progressive parsing - the current result is cached, and emitted on the next call
    // This is done in order to strip PKCS7 padding, which is found at the end of each segment. We only know we've reached
    // the end on flush(), but by that time we have already received all bytes for the segment.
    // Progressive decryption does not work with WebCrypto

    if (remainderData) {
      data = appendUint8Array(remainderData, data);
      this.remainderData = null;
    }

    // Byte length must be a multiple of 16 (AES-128 = 128 bit blocks = 16 bytes)
    const currentChunk = this.getValidChunk(data);
    if (!currentChunk.length) {
      return null;
    }
    if (currentIV) {
      iv = currentIV;
    }
    let softwareDecrypter = this.softwareDecrypter;
    if (!softwareDecrypter) {
      softwareDecrypter = this.softwareDecrypter = new AESDecryptor();
    }
    softwareDecrypter.expandKey(key);
    const result = currentResult;
    this.currentResult = softwareDecrypter.decrypt(currentChunk.buffer, 0, iv);
    this.currentIV = sliceUint8(currentChunk, -16).buffer;
    if (!result) {
      return null;
    }
    return result;
  }
  webCryptoDecrypt(data, key, iv) {
    const subtle = this.subtle;
    if (this.key !== key || !this.fastAesKey) {
      this.key = key;
      this.fastAesKey = new FastAESKey(subtle, key);
    }
    return this.fastAesKey.expandKey().then(aesKey => {
      // decrypt using web crypto
      if (!subtle) {
        return Promise.reject(new Error('web crypto not initialized'));
      }
      this.logOnce('WebCrypto AES decrypt');
      const crypto = new AESCrypto(subtle, new Uint8Array(iv));
      return crypto.decrypt(data.buffer, aesKey);
    }).catch(err => {
      logger.warn(`[decrypter]: WebCrypto Error, disable WebCrypto API, ${err.name}: ${err.message}`);
      return this.onWebCryptoError(data, key, iv);
    });
  }
  onWebCryptoError(data, key, iv) {
    this.useSoftware = true;
    this.logEnabled = true;
    this.softwareDecrypt(data, key, iv);
    const decryptResult = this.flush();
    if (decryptResult) {
      return decryptResult.buffer;
    }
    throw new Error('WebCrypto and softwareDecrypt: failed to decrypt data');
  }
  getValidChunk(data) {
    let currentChunk = data;
    const splitPoint = data.length - data.length % CHUNK_SIZE;
    if (splitPoint !== data.length) {
      currentChunk = sliceUint8(data, 0, splitPoint);
      this.remainderData = sliceUint8(data, splitPoint);
    }
    return currentChunk;
  }
  logOnce(msg) {
    if (!this.logEnabled) {
      return;
    }
    logger.log(`[decrypter]: ${msg}`);
    this.logEnabled = false;
  }
}

/**
 *  TimeRanges to string helper
 */

const TimeRanges = {
  toString: function (r) {
    let log = '';
    const len = r.length;
    for (let i = 0; i < len; i++) {
      log += `[${r.start(i).toFixed(3)}-${r.end(i).toFixed(3)}]`;
    }
    return log;
  }
};

const State = {
  STOPPED: 'STOPPED',
  IDLE: 'IDLE',
  KEY_LOADING: 'KEY_LOADING',
  FRAG_LOADING: 'FRAG_LOADING',
  FRAG_LOADING_WAITING_RETRY: 'FRAG_LOADING_WAITING_RETRY',
  WAITING_TRACK: 'WAITING_TRACK',
  PARSING: 'PARSING',
  PARSED: 'PARSED',
  ENDED: 'ENDED',
  ERROR: 'ERROR',
  WAITING_INIT_PTS: 'WAITING_INIT_PTS',
  WAITING_LEVEL: 'WAITING_LEVEL'
};
class BaseStreamController extends TaskLoop {
  constructor(hls, fragmentTracker, keyLoader, logPrefix, playlistType) {
    super();
    this.hls = void 0;
    this.fragPrevious = null;
    this.fragCurrent = null;
    this.fragmentTracker = void 0;
    this.transmuxer = null;
    this._state = State.STOPPED;
    this.playlistType = void 0;
    this.media = null;
    this.mediaBuffer = null;
    this.config = void 0;
    this.bitrateTest = false;
    this.lastCurrentTime = 0;
    this.nextLoadPosition = 0;
    this.startPosition = 0;
    this.startTimeOffset = null;
    this.loadedmetadata = false;
    this.retryDate = 0;
    this.levels = null;
    this.fragmentLoader = void 0;
    this.keyLoader = void 0;
    this.levelLastLoaded = null;
    this.startFragRequested = false;
    this.decrypter = void 0;
    this.initPTS = [];
    this.onvseeking = null;
    this.onvended = null;
    this.logPrefix = '';
    this.log = void 0;
    this.warn = void 0;
    this.playlistType = playlistType;
    this.logPrefix = logPrefix;
    this.log = logger.log.bind(logger, `${logPrefix}:`);
    this.warn = logger.warn.bind(logger, `${logPrefix}:`);
    this.hls = hls;
    this.fragmentLoader = new FragmentLoader(hls.config);
    this.keyLoader = keyLoader;
    this.fragmentTracker = fragmentTracker;
    this.config = hls.config;
    this.decrypter = new Decrypter(hls.config);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
  }
  doTick() {
    this.onTickEnd();
  }
  onTickEnd() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startLoad(startPosition) {}
  stopLoad() {
    this.fragmentLoader.abort();
    this.keyLoader.abort(this.playlistType);
    const frag = this.fragCurrent;
    if (frag != null && frag.loader) {
      frag.abortRequests();
      this.fragmentTracker.removeFragment(frag);
    }
    this.resetTransmuxer();
    this.fragCurrent = null;
    this.fragPrevious = null;
    this.clearInterval();
    this.clearNextTick();
    this.state = State.STOPPED;
  }
  _streamEnded(bufferInfo, levelDetails) {
    // If playlist is live, there is another buffered range after the current range, nothing buffered, media is detached,
    // of nothing loading/loaded return false
    if (levelDetails.live || bufferInfo.nextStart || !bufferInfo.end || !this.media) {
      return false;
    }
    const partList = levelDetails.partList;
    // Since the last part isn't guaranteed to correspond to the last playlist segment for Low-Latency HLS,
    // check instead if the last part is buffered.
    if (partList != null && partList.length) {
      const lastPart = partList[partList.length - 1];

      // Checking the midpoint of the part for potential margin of error and related issues.
      // NOTE: Technically I believe parts could yield content that is < the computed duration (including potential a duration of 0)
      // and still be spec-compliant, so there may still be edge cases here. Likewise, there could be issues in end of stream
      // part mismatches for independent audio and video playlists/segments.
      const lastPartBuffered = BufferHelper.isBuffered(this.media, lastPart.start + lastPart.duration / 2);
      return lastPartBuffered;
    }
    const playlistType = levelDetails.fragments[levelDetails.fragments.length - 1].type;
    return this.fragmentTracker.isEndListAppended(playlistType);
  }
  getLevelDetails() {
    if (this.levels && this.levelLastLoaded !== null) {
      var _this$levels$this$lev;
      return (_this$levels$this$lev = this.levels[this.levelLastLoaded]) == null ? void 0 : _this$levels$this$lev.details;
    }
  }
  onMediaAttached(event, data) {
    const media = this.media = this.mediaBuffer = data.media;
    this.onvseeking = this.onMediaSeeking.bind(this);
    this.onvended = this.onMediaEnded.bind(this);
    media.addEventListener('seeking', this.onvseeking);
    media.addEventListener('ended', this.onvended);
    const config = this.config;
    if (this.levels && config.autoStartLoad && this.state === State.STOPPED) {
      this.startLoad(config.startPosition);
    }
  }
  onMediaDetaching() {
    const media = this.media;
    if (media != null && media.ended) {
      this.log('MSE detaching and video ended, reset startPosition');
      this.startPosition = this.lastCurrentTime = 0;
    }

    // remove video listeners
    if (media && this.onvseeking && this.onvended) {
      media.removeEventListener('seeking', this.onvseeking);
      media.removeEventListener('ended', this.onvended);
      this.onvseeking = this.onvended = null;
    }
    if (this.keyLoader) {
      this.keyLoader.detach();
    }
    this.media = this.mediaBuffer = null;
    this.loadedmetadata = false;
    this.fragmentTracker.removeAllFragments();
    this.stopLoad();
  }
  onMediaSeeking() {
    const {
      config,
      fragCurrent,
      media,
      mediaBuffer,
      state
    } = this;
    const currentTime = media ? media.currentTime : 0;
    const bufferInfo = BufferHelper.bufferInfo(mediaBuffer ? mediaBuffer : media, currentTime, config.maxBufferHole);
    this.log(`media seeking to ${isFiniteNumber(currentTime) ? currentTime.toFixed(3) : currentTime}, state: ${state}`);
    if (this.state === State.ENDED) {
      this.resetLoadingState();
    } else if (fragCurrent) {
      // Seeking while frag load is in progress
      const tolerance = config.maxFragLookUpTolerance;
      const fragStartOffset = fragCurrent.start - tolerance;
      const fragEndOffset = fragCurrent.start + fragCurrent.duration + tolerance;
      // if seeking out of buffered range or into new one
      if (!bufferInfo.len || fragEndOffset < bufferInfo.start || fragStartOffset > bufferInfo.end) {
        const pastFragment = currentTime > fragEndOffset;
        // if the seek position is outside the current fragment range
        if (currentTime < fragStartOffset || pastFragment) {
          if (pastFragment && fragCurrent.loader) {
            this.log('seeking outside of buffer while fragment load in progress, cancel fragment load');
            fragCurrent.abortRequests();
            this.resetLoadingState();
          }
          this.fragPrevious = null;
        }
      }
    }
    if (media) {
      // Remove gap fragments
      this.fragmentTracker.removeFragmentsInRange(currentTime, Infinity, this.playlistType, true);
      this.lastCurrentTime = currentTime;
    }

    // in case seeking occurs although no media buffered, adjust startPosition and nextLoadPosition to seek target
    if (!this.loadedmetadata && !bufferInfo.len) {
      this.nextLoadPosition = this.startPosition = currentTime;
    }

    // Async tick to speed up processing
    this.tickImmediate();
  }
  onMediaEnded() {
    // reset startPosition and lastCurrentTime to restart playback @ stream beginning
    this.startPosition = this.lastCurrentTime = 0;
  }
  onManifestLoaded(event, data) {
    this.startTimeOffset = data.startTimeOffset;
    this.initPTS = [];
  }
  onHandlerDestroying() {
    this.stopLoad();
    super.onHandlerDestroying();
  }
  onHandlerDestroyed() {
    this.state = State.STOPPED;
    if (this.fragmentLoader) {
      this.fragmentLoader.destroy();
    }
    if (this.keyLoader) {
      this.keyLoader.destroy();
    }
    if (this.decrypter) {
      this.decrypter.destroy();
    }
    this.hls = this.log = this.warn = this.decrypter = this.keyLoader = this.fragmentLoader = this.fragmentTracker = null;
    super.onHandlerDestroyed();
  }
  loadFragment(frag, level, targetBufferTime) {
    this._loadFragForPlayback(frag, level, targetBufferTime);
  }
  _loadFragForPlayback(frag, level, targetBufferTime) {
    const progressCallback = data => {
      if (this.fragContextChanged(frag)) {
        this.warn(`Fragment ${frag.sn}${data.part ? ' p: ' + data.part.index : ''} of level ${frag.level} was dropped during download.`);
        this.fragmentTracker.removeFragment(frag);
        return;
      }
      frag.stats.chunkCount++;
      this._handleFragmentLoadProgress(data);
    };
    this._doFragLoad(frag, level, targetBufferTime, progressCallback).then(data => {
      if (!data) {
        // if we're here we probably needed to backtrack or are waiting for more parts
        return;
      }
      const state = this.state;
      if (this.fragContextChanged(frag)) {
        if (state === State.FRAG_LOADING || !this.fragCurrent && state === State.PARSING) {
          this.fragmentTracker.removeFragment(frag);
          this.state = State.IDLE;
        }
        return;
      }
      if ('payload' in data) {
        this.log(`Loaded fragment ${frag.sn} of level ${frag.level}`);
        this.hls.trigger(Events.FRAG_LOADED, data);
      }

      // Pass through the whole payload; controllers not implementing progressive loading receive data from this callback
      this._handleFragmentLoadComplete(data);
    }).catch(reason => {
      if (this.state === State.STOPPED || this.state === State.ERROR) {
        return;
      }
      this.warn(reason);
      this.resetFragmentLoading(frag);
    });
  }
  clearTrackerIfNeeded(frag) {
    var _this$mediaBuffer;
    const {
      fragmentTracker
    } = this;
    const fragState = fragmentTracker.getState(frag);
    if (fragState === FragmentState.APPENDING) {
      // Lower the buffer size and try again
      const playlistType = frag.type;
      const bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
      const minForwardBufferLength = Math.max(frag.duration, bufferedInfo ? bufferedInfo.len : this.config.maxBufferLength);
      if (this.reduceMaxBufferLength(minForwardBufferLength)) {
        fragmentTracker.removeFragment(frag);
      }
    } else if (((_this$mediaBuffer = this.mediaBuffer) == null ? void 0 : _this$mediaBuffer.buffered.length) === 0) {
      // Stop gap for bad tracker / buffer flush behavior
      fragmentTracker.removeAllFragments();
    } else if (fragmentTracker.hasParts(frag.type)) {
      // In low latency mode, remove fragments for which only some parts were buffered
      fragmentTracker.detectPartialFragments({
        frag,
        part: null,
        stats: frag.stats,
        id: frag.type
      });
      if (fragmentTracker.getState(frag) === FragmentState.PARTIAL) {
        fragmentTracker.removeFragment(frag);
      }
    }
  }
  checkLiveUpdate(details) {
    if (details.updated && !details.live) {
      // Live stream ended, update fragment tracker
      const lastFragment = details.fragments[details.fragments.length - 1];
      this.fragmentTracker.detectPartialFragments({
        frag: lastFragment,
        part: null,
        stats: lastFragment.stats,
        id: lastFragment.type
      });
    }
    if (!details.fragments[0]) {
      details.deltaUpdateFailed = true;
    }
  }
  flushMainBuffer(startOffset, endOffset, type = null) {
    if (!(startOffset - endOffset)) {
      return;
    }
    // When alternate audio is playing, the audio-stream-controller is responsible for the audio buffer. Otherwise,
    // passing a null type flushes both buffers
    const flushScope = {
      startOffset,
      endOffset,
      type
    };
    this.hls.trigger(Events.BUFFER_FLUSHING, flushScope);
  }
  _loadInitSegment(frag, level) {
    this._doFragLoad(frag, level).then(data => {
      if (!data || this.fragContextChanged(frag) || !this.levels) {
        throw new Error('init load aborted');
      }
      return data;
    }).then(data => {
      const {
        hls
      } = this;
      const {
        payload
      } = data;
      const decryptData = frag.decryptdata;

      // check to see if the payload needs to be decrypted
      if (payload && payload.byteLength > 0 && decryptData && decryptData.key && decryptData.iv && decryptData.method === 'AES-128') {
        const startTime = self.performance.now();
        // decrypt init segment data
        return this.decrypter.decrypt(new Uint8Array(payload), decryptData.key.buffer, decryptData.iv.buffer).catch(err => {
          hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.FRAG_DECRYPT_ERROR,
            fatal: false,
            error: err,
            reason: err.message,
            frag
          });
          throw err;
        }).then(decryptedData => {
          const endTime = self.performance.now();
          hls.trigger(Events.FRAG_DECRYPTED, {
            frag,
            payload: decryptedData,
            stats: {
              tstart: startTime,
              tdecrypt: endTime
            }
          });
          data.payload = decryptedData;
          return data;
        });
      }
      return data;
    }).then(data => {
      const {
        fragCurrent,
        hls,
        levels
      } = this;
      if (!levels) {
        throw new Error('init load aborted, missing levels');
      }
      const stats = frag.stats;
      this.state = State.IDLE;
      level.fragmentError = 0;
      frag.data = new Uint8Array(data.payload);
      stats.parsing.start = stats.buffering.start = self.performance.now();
      stats.parsing.end = stats.buffering.end = self.performance.now();

      // Silence FRAG_BUFFERED event if fragCurrent is null
      if (data.frag === fragCurrent) {
        hls.trigger(Events.FRAG_BUFFERED, {
          stats,
          frag: fragCurrent,
          part: null,
          id: frag.type
        });
      }
      this.tick();
    }).catch(reason => {
      if (this.state === State.STOPPED || this.state === State.ERROR) {
        return;
      }
      this.warn(reason);
      this.resetFragmentLoading(frag);
    });
  }
  fragContextChanged(frag) {
    const {
      fragCurrent
    } = this;
    return !frag || !fragCurrent || frag.level !== fragCurrent.level || frag.sn !== fragCurrent.sn || frag.urlId !== fragCurrent.urlId;
  }
  fragBufferedComplete(frag, part) {
    var _frag$startPTS, _frag$endPTS, _this$fragCurrent, _this$fragPrevious;
    const media = this.mediaBuffer ? this.mediaBuffer : this.media;
    this.log(`Buffered ${frag.type} sn: ${frag.sn}${part ? ' part: ' + part.index : ''} of ${this.playlistType === PlaylistLevelType.MAIN ? 'level' : 'track'} ${frag.level} (frag:[${((_frag$startPTS = frag.startPTS) != null ? _frag$startPTS : NaN).toFixed(3)}-${((_frag$endPTS = frag.endPTS) != null ? _frag$endPTS : NaN).toFixed(3)}] > buffer:${media ? TimeRanges.toString(BufferHelper.getBuffered(media)) : '(detached)'})`);
    this.state = State.IDLE;
    if (!media) {
      return;
    }
    if (!this.loadedmetadata && frag.type == PlaylistLevelType.MAIN && media.buffered.length && ((_this$fragCurrent = this.fragCurrent) == null ? void 0 : _this$fragCurrent.sn) === ((_this$fragPrevious = this.fragPrevious) == null ? void 0 : _this$fragPrevious.sn)) {
      this.loadedmetadata = true;
      this.seekToStartPos();
    }
    this.tick();
  }
  seekToStartPos() {}
  _handleFragmentLoadComplete(fragLoadedEndData) {
    const {
      transmuxer
    } = this;
    if (!transmuxer) {
      return;
    }
    const {
      frag,
      part,
      partsLoaded
    } = fragLoadedEndData;
    // If we did not load parts, or loaded all parts, we have complete (not partial) fragment data
    const complete = !partsLoaded || partsLoaded.length === 0 || partsLoaded.some(fragLoaded => !fragLoaded);
    const chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount + 1, 0, part ? part.index : -1, !complete);
    transmuxer.flush(chunkMeta);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _handleFragmentLoadProgress(frag) {}
  _doFragLoad(frag, level, targetBufferTime = null, progressCallback) {
    var _frag$decryptdata;
    const details = level == null ? void 0 : level.details;
    if (!this.levels || !details) {
      throw new Error(`frag load aborted, missing level${details ? '' : ' detail'}s`);
    }
    let keyLoadingPromise = null;
    if (frag.encrypted && !((_frag$decryptdata = frag.decryptdata) != null && _frag$decryptdata.key)) {
      this.log(`Loading key for ${frag.sn} of [${details.startSN}-${details.endSN}], ${this.logPrefix === '[stream-controller]' ? 'level' : 'track'} ${frag.level}`);
      this.state = State.KEY_LOADING;
      this.fragCurrent = frag;
      keyLoadingPromise = this.keyLoader.load(frag).then(keyLoadedData => {
        if (!this.fragContextChanged(keyLoadedData.frag)) {
          this.hls.trigger(Events.KEY_LOADED, keyLoadedData);
          if (this.state === State.KEY_LOADING) {
            this.state = State.IDLE;
          }
          return keyLoadedData;
        }
      });
      this.hls.trigger(Events.KEY_LOADING, {
        frag
      });
      if (this.fragCurrent === null) {
        keyLoadingPromise = Promise.reject(new Error(`frag load aborted, context changed in KEY_LOADING`));
      }
    } else if (!frag.encrypted && details.encryptedFragments.length) {
      this.keyLoader.loadClear(frag, details.encryptedFragments);
    }
    targetBufferTime = Math.max(frag.start, targetBufferTime || 0);
    if (this.config.lowLatencyMode && frag.sn !== 'initSegment') {
      const partList = details.partList;
      if (partList && progressCallback) {
        if (targetBufferTime > frag.end && details.fragmentHint) {
          frag = details.fragmentHint;
        }
        const partIndex = this.getNextPart(partList, frag, targetBufferTime);
        if (partIndex > -1) {
          const part = partList[partIndex];
          this.log(`Loading part sn: ${frag.sn} p: ${part.index} cc: ${frag.cc} of playlist [${details.startSN}-${details.endSN}] parts [0-${partIndex}-${partList.length - 1}] ${this.logPrefix === '[stream-controller]' ? 'level' : 'track'}: ${frag.level}, target: ${parseFloat(targetBufferTime.toFixed(3))}`);
          this.nextLoadPosition = part.start + part.duration;
          this.state = State.FRAG_LOADING;
          let _result;
          if (keyLoadingPromise) {
            _result = keyLoadingPromise.then(keyLoadedData => {
              if (!keyLoadedData || this.fragContextChanged(keyLoadedData.frag)) {
                return null;
              }
              return this.doFragPartsLoad(frag, part, level, progressCallback);
            }).catch(error => this.handleFragLoadError(error));
          } else {
            _result = this.doFragPartsLoad(frag, part, level, progressCallback).catch(error => this.handleFragLoadError(error));
          }
          this.hls.trigger(Events.FRAG_LOADING, {
            frag,
            part,
            targetBufferTime
          });
          if (this.fragCurrent === null) {
            return Promise.reject(new Error(`frag load aborted, context changed in FRAG_LOADING parts`));
          }
          return _result;
        } else if (!frag.url || this.loadedEndOfParts(partList, targetBufferTime)) {
          // Fragment hint has no parts
          return Promise.resolve(null);
        }
      }
    }
    this.log(`Loading fragment ${frag.sn} cc: ${frag.cc} ${details ? 'of [' + details.startSN + '-' + details.endSN + '] ' : ''}${this.logPrefix === '[stream-controller]' ? 'level' : 'track'}: ${frag.level}, target: ${parseFloat(targetBufferTime.toFixed(3))}`);
    // Don't update nextLoadPosition for fragments which are not buffered
    if (isFiniteNumber(frag.sn) && !this.bitrateTest) {
      this.nextLoadPosition = frag.start + frag.duration;
    }
    this.state = State.FRAG_LOADING;

    // Load key before streaming fragment data
    const dataOnProgress = this.config.progressive;
    let result;
    if (dataOnProgress && keyLoadingPromise) {
      result = keyLoadingPromise.then(keyLoadedData => {
        if (!keyLoadedData || this.fragContextChanged(keyLoadedData == null ? void 0 : keyLoadedData.frag)) {
          return null;
        }
        return this.fragmentLoader.load(frag, progressCallback);
      }).catch(error => this.handleFragLoadError(error));
    } else {
      // load unencrypted fragment data with progress event,
      // or handle fragment result after key and fragment are finished loading
      result = Promise.all([this.fragmentLoader.load(frag, dataOnProgress ? progressCallback : undefined), keyLoadingPromise]).then(([fragLoadedData]) => {
        if (!dataOnProgress && fragLoadedData && progressCallback) {
          progressCallback(fragLoadedData);
        }
        return fragLoadedData;
      }).catch(error => this.handleFragLoadError(error));
    }
    this.hls.trigger(Events.FRAG_LOADING, {
      frag,
      targetBufferTime
    });
    if (this.fragCurrent === null) {
      return Promise.reject(new Error(`frag load aborted, context changed in FRAG_LOADING`));
    }
    return result;
  }
  doFragPartsLoad(frag, fromPart, level, progressCallback) {
    return new Promise((resolve, reject) => {
      var _level$details;
      const partsLoaded = [];
      const initialPartList = (_level$details = level.details) == null ? void 0 : _level$details.partList;
      const loadPart = part => {
        this.fragmentLoader.loadPart(frag, part, progressCallback).then(partLoadedData => {
          partsLoaded[part.index] = partLoadedData;
          const loadedPart = partLoadedData.part;
          this.hls.trigger(Events.FRAG_LOADED, partLoadedData);
          const nextPart = getPartWith(level, frag.sn, part.index + 1) || findPart(initialPartList, frag.sn, part.index + 1);
          if (nextPart) {
            loadPart(nextPart);
          } else {
            return resolve({
              frag,
              part: loadedPart,
              partsLoaded
            });
          }
        }).catch(reject);
      };
      loadPart(fromPart);
    });
  }
  handleFragLoadError(error) {
    if ('data' in error) {
      const data = error.data;
      if (error.data && data.details === ErrorDetails.INTERNAL_ABORTED) {
        this.handleFragLoadAborted(data.frag, data.part);
      } else {
        this.hls.trigger(Events.ERROR, data);
      }
    } else {
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.INTERNAL_EXCEPTION,
        err: error,
        error,
        fatal: true
      });
    }
    return null;
  }
  _handleTransmuxerFlush(chunkMeta) {
    const context = this.getCurrentContext(chunkMeta);
    if (!context || this.state !== State.PARSING) {
      if (!this.fragCurrent && this.state !== State.STOPPED && this.state !== State.ERROR) {
        this.state = State.IDLE;
      }
      return;
    }
    const {
      frag,
      part,
      level
    } = context;
    const now = self.performance.now();
    frag.stats.parsing.end = now;
    if (part) {
      part.stats.parsing.end = now;
    }
    this.updateLevelTiming(frag, part, level, chunkMeta.partial);
  }
  getCurrentContext(chunkMeta) {
    const {
      levels,
      fragCurrent
    } = this;
    const {
      level: levelIndex,
      sn,
      part: partIndex
    } = chunkMeta;
    if (!(levels != null && levels[levelIndex])) {
      this.warn(`Levels object was unset while buffering fragment ${sn} of level ${levelIndex}. The current chunk will not be buffered.`);
      return null;
    }
    const level = levels[levelIndex];
    const part = partIndex > -1 ? getPartWith(level, sn, partIndex) : null;
    const frag = part ? part.fragment : getFragmentWithSN(level, sn, fragCurrent);
    if (!frag) {
      return null;
    }
    if (fragCurrent && fragCurrent !== frag) {
      frag.stats = fragCurrent.stats;
    }
    return {
      frag,
      part,
      level
    };
  }
  bufferFragmentData(data, frag, part, chunkMeta, noBacktracking) {
    var _buffer;
    if (!data || this.state !== State.PARSING) {
      return;
    }
    const {
      data1,
      data2
    } = data;
    let buffer = data1;
    if (data1 && data2) {
      // Combine the moof + mdat so that we buffer with a single append
      buffer = appendUint8Array(data1, data2);
    }
    if (!((_buffer = buffer) != null && _buffer.length)) {
      return;
    }
    const segment = {
      type: data.type,
      frag,
      part,
      chunkMeta,
      parent: frag.type,
      data: buffer
    };
    this.hls.trigger(Events.BUFFER_APPENDING, segment);
    if (data.dropped && data.independent && !part) {
      if (noBacktracking) {
        return;
      }
      // Clear buffer so that we reload previous segments sequentially if required
      this.flushBufferGap(frag);
    }
  }
  flushBufferGap(frag) {
    const media = this.media;
    if (!media) {
      return;
    }
    // If currentTime is not buffered, clear the back buffer so that we can backtrack as much as needed
    if (!BufferHelper.isBuffered(media, media.currentTime)) {
      this.flushMainBuffer(0, frag.start);
      return;
    }
    // Remove back-buffer without interrupting playback to allow back tracking
    const currentTime = media.currentTime;
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const fragDuration = frag.duration;
    const segmentFraction = Math.min(this.config.maxFragLookUpTolerance * 2, fragDuration * 0.25);
    const start = Math.max(Math.min(frag.start - segmentFraction, bufferInfo.end - segmentFraction), currentTime + segmentFraction);
    if (frag.start - start > segmentFraction) {
      this.flushMainBuffer(start, frag.start);
    }
  }
  getFwdBufferInfo(bufferable, type) {
    const pos = this.getLoadPosition();
    if (!isFiniteNumber(pos)) {
      return null;
    }
    return this.getFwdBufferInfoAtPos(bufferable, pos, type);
  }
  getFwdBufferInfoAtPos(bufferable, pos, type) {
    const {
      config: {
        maxBufferHole
      }
    } = this;
    const bufferInfo = BufferHelper.bufferInfo(bufferable, pos, maxBufferHole);
    // Workaround flaw in getting forward buffer when maxBufferHole is smaller than gap at current pos
    if (bufferInfo.len === 0 && bufferInfo.nextStart !== undefined) {
      const bufferedFragAtPos = this.fragmentTracker.getBufferedFrag(pos, type);
      if (bufferedFragAtPos && bufferInfo.nextStart < bufferedFragAtPos.end) {
        return BufferHelper.bufferInfo(bufferable, pos, Math.max(bufferInfo.nextStart, maxBufferHole));
      }
    }
    return bufferInfo;
  }
  getMaxBufferLength(levelBitrate) {
    const {
      config
    } = this;
    let maxBufLen;
    if (levelBitrate) {
      maxBufLen = Math.max(8 * config.maxBufferSize / levelBitrate, config.maxBufferLength);
    } else {
      maxBufLen = config.maxBufferLength;
    }
    return Math.min(maxBufLen, config.maxMaxBufferLength);
  }
  reduceMaxBufferLength(threshold) {
    const config = this.config;
    const minLength = threshold || config.maxBufferLength;
    if (config.maxMaxBufferLength >= minLength) {
      // reduce max buffer length as it might be too high. we do this to avoid loop flushing ...
      config.maxMaxBufferLength /= 2;
      this.warn(`Reduce max buffer length to ${config.maxMaxBufferLength}s`);
      return true;
    }
    return false;
  }
  getAppendedFrag(position, playlistType = PlaylistLevelType.MAIN) {
    const fragOrPart = this.fragmentTracker.getAppendedFrag(position, PlaylistLevelType.MAIN);
    if (fragOrPart && 'fragment' in fragOrPart) {
      return fragOrPart.fragment;
    }
    return fragOrPart;
  }
  getNextFragment(pos, levelDetails) {
    const fragments = levelDetails.fragments;
    const fragLen = fragments.length;
    if (!fragLen) {
      return null;
    }

    // find fragment index, contiguous with end of buffer position
    const {
      config
    } = this;
    const start = fragments[0].start;
    let frag;
    if (levelDetails.live) {
      const initialLiveManifestSize = config.initialLiveManifestSize;
      if (fragLen < initialLiveManifestSize) {
        this.warn(`Not enough fragments to start playback (have: ${fragLen}, need: ${initialLiveManifestSize})`);
        return null;
      }
      // The real fragment start times for a live stream are only known after the PTS range for that level is known.
      // In order to discover the range, we load the best matching fragment for that level and demux it.
      // Do not load using live logic if the starting frag is requested - we want to use getFragmentAtPosition() so that
      // we get the fragment matching that start time
      if (!levelDetails.PTSKnown && !this.startFragRequested && this.startPosition === -1) {
        frag = this.getInitialLiveFragment(levelDetails, fragments);
        this.startPosition = frag ? this.hls.liveSyncPosition || frag.start : pos;
      }
    } else if (pos <= start) {
      // VoD playlist: if loadPosition before start of playlist, load first fragment
      frag = fragments[0];
    }

    // If we haven't run into any special cases already, just load the fragment most closely matching the requested position
    if (!frag) {
      const end = config.lowLatencyMode ? levelDetails.partEnd : levelDetails.fragmentEnd;
      frag = this.getFragmentAtPosition(pos, end, levelDetails);
    }
    return this.mapToInitFragWhenRequired(frag);
  }
  isLoopLoading(frag, targetBufferTime) {
    const trackerState = this.fragmentTracker.getState(frag);
    return (trackerState === FragmentState.OK || trackerState === FragmentState.PARTIAL && !!frag.gap) && this.nextLoadPosition > targetBufferTime;
  }
  getNextFragmentLoopLoading(frag, levelDetails, bufferInfo, playlistType, maxBufLen) {
    const gapStart = frag.gap;
    const nextFragment = this.getNextFragment(this.nextLoadPosition, levelDetails);
    if (nextFragment === null) {
      return nextFragment;
    }
    frag = nextFragment;
    if (gapStart && frag && !frag.gap && bufferInfo.nextStart) {
      // Media buffered after GAP tags should not make the next buffer timerange exceed forward buffer length
      const nextbufferInfo = this.getFwdBufferInfoAtPos(this.mediaBuffer ? this.mediaBuffer : this.media, bufferInfo.nextStart, playlistType);
      if (nextbufferInfo !== null && bufferInfo.len + nextbufferInfo.len >= maxBufLen) {
        // Returning here might result in not finding an audio and video candiate to skip to
        this.log(`buffer full after gaps in "${playlistType}" playlist starting at sn: ${frag.sn}`);
        return null;
      }
    }
    return frag;
  }
  mapToInitFragWhenRequired(frag) {
    // If an initSegment is present, it must be buffered first
    if (frag != null && frag.initSegment && !(frag != null && frag.initSegment.data) && !this.bitrateTest) {
      return frag.initSegment;
    }
    return frag;
  }
  getNextPart(partList, frag, targetBufferTime) {
    let nextPart = -1;
    let contiguous = false;
    let independentAttrOmitted = true;
    for (let i = 0, len = partList.length; i < len; i++) {
      const part = partList[i];
      independentAttrOmitted = independentAttrOmitted && !part.independent;
      if (nextPart > -1 && targetBufferTime < part.start) {
        break;
      }
      const loaded = part.loaded;
      if (loaded) {
        nextPart = -1;
      } else if ((contiguous || part.independent || independentAttrOmitted) && part.fragment === frag) {
        nextPart = i;
      }
      contiguous = loaded;
    }
    return nextPart;
  }
  loadedEndOfParts(partList, targetBufferTime) {
    const lastPart = partList[partList.length - 1];
    return lastPart && targetBufferTime > lastPart.start && lastPart.loaded;
  }

  /*
   This method is used find the best matching first fragment for a live playlist. This fragment is used to calculate the
   "sliding" of the playlist, which is its offset from the start of playback. After sliding we can compute the real
   start and end times for each fragment in the playlist (after which this method will not need to be called).
  */
  getInitialLiveFragment(levelDetails, fragments) {
    const fragPrevious = this.fragPrevious;
    let frag = null;
    if (fragPrevious) {
      if (levelDetails.hasProgramDateTime) {
        // Prefer using PDT, because it can be accurate enough to choose the correct fragment without knowing the level sliding
        this.log(`Live playlist, switching playlist, load frag with same PDT: ${fragPrevious.programDateTime}`);
        frag = findFragmentByPDT(fragments, fragPrevious.endProgramDateTime, this.config.maxFragLookUpTolerance);
      }
      if (!frag) {
        // SN does not need to be accurate between renditions, but depending on the packaging it may be so.
        const targetSN = fragPrevious.sn + 1;
        if (targetSN >= levelDetails.startSN && targetSN <= levelDetails.endSN) {
          const fragNext = fragments[targetSN - levelDetails.startSN];
          // Ensure that we're staying within the continuity range, since PTS resets upon a new range
          if (fragPrevious.cc === fragNext.cc) {
            frag = fragNext;
            this.log(`Live playlist, switching playlist, load frag with next SN: ${frag.sn}`);
          }
        }
        // It's important to stay within the continuity range if available; otherwise the fragments in the playlist
        // will have the wrong start times
        if (!frag) {
          frag = findFragWithCC(fragments, fragPrevious.cc);
          if (frag) {
            this.log(`Live playlist, switching playlist, load frag with same CC: ${frag.sn}`);
          }
        }
      }
    } else {
      // Find a new start fragment when fragPrevious is null
      const liveStart = this.hls.liveSyncPosition;
      if (liveStart !== null) {
        frag = this.getFragmentAtPosition(liveStart, this.bitrateTest ? levelDetails.fragmentEnd : levelDetails.edge, levelDetails);
      }
    }
    return frag;
  }

  /*
  This method finds the best matching fragment given the provided position.
   */
  getFragmentAtPosition(bufferEnd, end, levelDetails) {
    const {
      config
    } = this;
    let {
      fragPrevious
    } = this;
    let {
      fragments,
      endSN
    } = levelDetails;
    const {
      fragmentHint
    } = levelDetails;
    const tolerance = config.maxFragLookUpTolerance;
    const partList = levelDetails.partList;
    const loadingParts = !!(config.lowLatencyMode && partList != null && partList.length && fragmentHint);
    if (loadingParts && fragmentHint && !this.bitrateTest) {
      // Include incomplete fragment with parts at end
      fragments = fragments.concat(fragmentHint);
      endSN = fragmentHint.sn;
    }
    let frag;
    if (bufferEnd < end) {
      const lookupTolerance = bufferEnd > end - tolerance ? 0 : tolerance;
      // Remove the tolerance if it would put the bufferEnd past the actual end of stream
      // Uses buffer and sequence number to calculate switch segment (required if using EXT-X-DISCONTINUITY-SEQUENCE)
      frag = findFragmentByPTS(fragPrevious, fragments, bufferEnd, lookupTolerance);
    } else {
      // reach end of playlist
      frag = fragments[fragments.length - 1];
    }
    if (frag) {
      const curSNIdx = frag.sn - levelDetails.startSN;
      // Move fragPrevious forward to support forcing the next fragment to load
      // when the buffer catches up to a previously buffered range.
      const fragState = this.fragmentTracker.getState(frag);
      if (fragState === FragmentState.OK || fragState === FragmentState.PARTIAL && frag.gap) {
        fragPrevious = frag;
      }
      if (fragPrevious && frag.sn === fragPrevious.sn && (!loadingParts || partList[0].fragment.sn > frag.sn)) {
        // Force the next fragment to load if the previous one was already selected. This can occasionally happen with
        // non-uniform fragment durations
        const sameLevel = fragPrevious && frag.level === fragPrevious.level;
        if (sameLevel) {
          const nextFrag = fragments[curSNIdx + 1];
          if (frag.sn < endSN && this.fragmentTracker.getState(nextFrag) !== FragmentState.OK) {
            frag = nextFrag;
          } else {
            frag = null;
          }
        }
      }
    }
    return frag;
  }
  synchronizeToLiveEdge(levelDetails) {
    const {
      config,
      media
    } = this;
    if (!media) {
      return;
    }
    const liveSyncPosition = this.hls.liveSyncPosition;
    const currentTime = media.currentTime;
    const start = levelDetails.fragments[0].start;
    const end = levelDetails.edge;
    const withinSlidingWindow = currentTime >= start - config.maxFragLookUpTolerance && currentTime <= end;
    // Continue if we can seek forward to sync position or if current time is outside of sliding window
    if (liveSyncPosition !== null && media.duration > liveSyncPosition && (currentTime < liveSyncPosition || !withinSlidingWindow)) {
      // Continue if buffer is starving or if current time is behind max latency
      const maxLatency = config.liveMaxLatencyDuration !== undefined ? config.liveMaxLatencyDuration : config.liveMaxLatencyDurationCount * levelDetails.targetduration;
      if (!withinSlidingWindow && media.readyState < 4 || currentTime < end - maxLatency) {
        if (!this.loadedmetadata) {
          this.nextLoadPosition = liveSyncPosition;
        }
        // Only seek if ready and there is not a significant forward buffer available for playback
        if (media.readyState) {
          this.warn(`Playback: ${currentTime.toFixed(3)} is located too far from the end of live sliding playlist: ${end}, reset currentTime to : ${liveSyncPosition.toFixed(3)}`);
          media.currentTime = liveSyncPosition;
        }
      }
    }
  }
  alignPlaylists(details, previousDetails) {
    const {
      levels,
      levelLastLoaded,
      fragPrevious
    } = this;
    const lastLevel = levelLastLoaded !== null ? levels[levelLastLoaded] : null;

    // FIXME: If not for `shouldAlignOnDiscontinuities` requiring fragPrevious.cc,
    //  this could all go in level-helper mergeDetails()
    const length = details.fragments.length;
    if (!length) {
      this.warn(`No fragments in live playlist`);
      return 0;
    }
    const slidingStart = details.fragments[0].start;
    const firstLevelLoad = !previousDetails;
    const aligned = details.alignedSliding && isFiniteNumber(slidingStart);
    if (firstLevelLoad || !aligned && !slidingStart) {
      alignStream(fragPrevious, lastLevel, details);
      const alignedSlidingStart = details.fragments[0].start;
      this.log(`Live playlist sliding: ${alignedSlidingStart.toFixed(2)} start-sn: ${previousDetails ? previousDetails.startSN : 'na'}->${details.startSN} prev-sn: ${fragPrevious ? fragPrevious.sn : 'na'} fragments: ${length}`);
      return alignedSlidingStart;
    }
    return slidingStart;
  }
  waitForCdnTuneIn(details) {
    // Wait for Low-Latency CDN Tune-in to get an updated playlist
    const advancePartLimit = 3;
    return details.live && details.canBlockReload && details.partTarget && details.tuneInGoal > Math.max(details.partHoldBack, details.partTarget * advancePartLimit);
  }
  setStartPosition(details, sliding) {
    // compute start position if set to -1. use it straight away if value is defined
    let startPosition = this.startPosition;
    if (startPosition < sliding) {
      startPosition = -1;
    }
    if (startPosition === -1 || this.lastCurrentTime === -1) {
      // Use Playlist EXT-X-START:TIME-OFFSET when set
      // Prioritize Multivariant Playlist offset so that main, audio, and subtitle stream-controller start times match
      const offsetInMultivariantPlaylist = this.startTimeOffset !== null;
      const startTimeOffset = offsetInMultivariantPlaylist ? this.startTimeOffset : details.startTimeOffset;
      if (startTimeOffset !== null && isFiniteNumber(startTimeOffset)) {
        startPosition = sliding + startTimeOffset;
        if (startTimeOffset < 0) {
          startPosition += details.totalduration;
        }
        startPosition = Math.min(Math.max(sliding, startPosition), sliding + details.totalduration);
        this.log(`Start time offset ${startTimeOffset} found in ${offsetInMultivariantPlaylist ? 'multivariant' : 'media'} playlist, adjust startPosition to ${startPosition}`);
        this.startPosition = startPosition;
      } else if (details.live) {
        // Leave this.startPosition at -1, so that we can use `getInitialLiveFragment` logic when startPosition has
        // not been specified via the config or an as an argument to startLoad (#3736).
        startPosition = this.hls.liveSyncPosition || sliding;
      } else {
        this.startPosition = startPosition = 0;
      }
      this.lastCurrentTime = startPosition;
    }
    this.nextLoadPosition = startPosition;
  }
  getLoadPosition() {
    const {
      media
    } = this;
    // if we have not yet loaded any fragment, start loading from start position
    let pos = 0;
    if (this.loadedmetadata && media) {
      pos = media.currentTime;
    } else if (this.nextLoadPosition) {
      pos = this.nextLoadPosition;
    }
    return pos;
  }
  handleFragLoadAborted(frag, part) {
    if (this.transmuxer && frag.sn !== 'initSegment' && frag.stats.aborted) {
      this.warn(`Fragment ${frag.sn}${part ? ' part ' + part.index : ''} of level ${frag.level} was aborted`);
      this.resetFragmentLoading(frag);
    }
  }
  resetFragmentLoading(frag) {
    if (!this.fragCurrent || !this.fragContextChanged(frag) && this.state !== State.FRAG_LOADING_WAITING_RETRY) {
      this.state = State.IDLE;
    }
  }
  onFragmentOrKeyLoadError(filterType, data) {
    if (data.chunkMeta && !data.frag) {
      const context = this.getCurrentContext(data.chunkMeta);
      if (context) {
        data.frag = context.frag;
      }
    }
    const frag = data.frag;
    // Handle frag error related to caller's filterType
    if (!frag || frag.type !== filterType || !this.levels) {
      return;
    }
    if (this.fragContextChanged(frag)) {
      var _this$fragCurrent2;
      this.warn(`Frag load error must match current frag to retry ${frag.url} > ${(_this$fragCurrent2 = this.fragCurrent) == null ? void 0 : _this$fragCurrent2.url}`);
      return;
    }
    const gapTagEncountered = data.details === ErrorDetails.FRAG_GAP;
    if (gapTagEncountered) {
      this.fragmentTracker.fragBuffered(frag, true);
    }
    // keep retrying until the limit will be reached
    const errorAction = data.errorAction;
    const {
      action,
      retryCount = 0,
      retryConfig
    } = errorAction || {};
    if (errorAction && action === NetworkErrorAction.RetryRequest && retryConfig) {
      var _this$levelLastLoaded;
      this.resetStartWhenNotLoaded((_this$levelLastLoaded = this.levelLastLoaded) != null ? _this$levelLastLoaded : frag.level);
      const delay = getRetryDelay(retryConfig, retryCount);
      this.warn(`Fragment ${frag.sn} of ${filterType} ${frag.level} errored with ${data.details}, retrying loading ${retryCount + 1}/${retryConfig.maxNumRetry} in ${delay}ms`);
      errorAction.resolved = true;
      this.retryDate = self.performance.now() + delay;
      this.state = State.FRAG_LOADING_WAITING_RETRY;
    } else if (retryConfig && errorAction) {
      this.resetFragmentErrors(filterType);
      if (retryCount < retryConfig.maxNumRetry) {
        // Network retry is skipped when level switch is preferred
        if (!gapTagEncountered) {
          errorAction.resolved = true;
        }
      } else {
        logger.warn(`${data.details} reached or exceeded max retry (${retryCount})`);
      }
    } else if ((errorAction == null ? void 0 : errorAction.action) === NetworkErrorAction.SendAlternateToPenaltyBox) {
      this.state = State.WAITING_LEVEL;
    } else {
      this.state = State.ERROR;
    }
    // Perform next async tick sooner to speed up error action resolution
    this.tickImmediate();
  }
  reduceLengthAndFlushBuffer(data) {
    // if in appending state
    if (this.state === State.PARSING || this.state === State.PARSED) {
      const playlistType = data.parent;
      const bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
      // 0.5 : tolerance needed as some browsers stalls playback before reaching buffered end
      // reduce max buf len if current position is buffered
      const buffered = bufferedInfo && bufferedInfo.len > 0.5;
      if (buffered) {
        this.reduceMaxBufferLength(bufferedInfo.len);
      }
      const flushBuffer = !buffered;
      if (flushBuffer) {
        // current position is not buffered, but browser is still complaining about buffer full error
        // this happens on IE/Edge, refer to https://github.com/video-dev/hls.js/pull/708
        // in that case flush the whole audio buffer to recover
        this.warn(`Buffer full error while media.currentTime is not buffered, flush ${playlistType} buffer`);
      }
      if (data.frag) {
        this.fragmentTracker.removeFragment(data.frag);
        this.nextLoadPosition = data.frag.start;
      }
      this.resetLoadingState();
      return flushBuffer;
    }
    return false;
  }
  resetFragmentErrors(filterType) {
    if (filterType === PlaylistLevelType.AUDIO) {
      // Reset current fragment since audio track audio is essential and may not have a fail-over track
      this.fragCurrent = null;
    }
    // Fragment errors that result in a level switch or redundant fail-over
    // should reset the stream controller state to idle
    if (!this.loadedmetadata) {
      this.startFragRequested = false;
    }
    if (this.state !== State.STOPPED) {
      this.state = State.IDLE;
    }
  }
  afterBufferFlushed(media, bufferType, playlistType) {
    if (!media) {
      return;
    }
    // After successful buffer flushing, filter flushed fragments from bufferedFrags use mediaBuffered instead of media
    // (so that we will check against video.buffered ranges in case of alt audio track)
    const bufferedTimeRanges = BufferHelper.getBuffered(media);
    this.fragmentTracker.detectEvictedFragments(bufferType, bufferedTimeRanges, playlistType);
    if (this.state === State.ENDED) {
      this.resetLoadingState();
    }
  }
  resetLoadingState() {
    this.log('Reset loading state');
    this.fragCurrent = null;
    this.fragPrevious = null;
    this.state = State.IDLE;
  }
  resetStartWhenNotLoaded(level) {
    // if loadedmetadata is not set, it means that first frag request failed
    // in that case, reset startFragRequested flag
    if (!this.loadedmetadata) {
      this.startFragRequested = false;
      const details = this.levels ? this.levels[level].details : null;
      if (details != null && details.live) {
        // Update the start position and return to IDLE to recover live start
        this.startPosition = -1;
        this.setStartPosition(details, 0);
        this.resetLoadingState();
      } else {
        this.nextLoadPosition = this.startPosition;
      }
    }
  }
  resetWhenMissingContext(chunkMeta) {
    var _this$levelLastLoaded2;
    this.warn(`The loading context changed while buffering fragment ${chunkMeta.sn} of level ${chunkMeta.level}. This chunk will not be buffered.`);
    this.removeUnbufferedFrags();
    this.resetStartWhenNotLoaded((_this$levelLastLoaded2 = this.levelLastLoaded) != null ? _this$levelLastLoaded2 : chunkMeta.level);
    this.resetLoadingState();
  }
  removeUnbufferedFrags(start = 0) {
    this.fragmentTracker.removeFragmentsInRange(start, Infinity, this.playlistType, false, true);
  }
  updateLevelTiming(frag, part, level, partial) {
    var _this$transmuxer;
    const details = level.details;
    if (!details) {
      this.warn('level.details undefined');
      return;
    }
    const parsed = Object.keys(frag.elementaryStreams).reduce((result, type) => {
      const info = frag.elementaryStreams[type];
      if (info) {
        const parsedDuration = info.endPTS - info.startPTS;
        if (parsedDuration <= 0) {
          // Destroy the transmuxer after it's next time offset failed to advance because duration was <= 0.
          // The new transmuxer will be configured with a time offset matching the next fragment start,
          // preventing the timeline from shifting.
          this.warn(`Could not parse fragment ${frag.sn} ${type} duration reliably (${parsedDuration})`);
          return result || false;
        }
        const drift = partial ? 0 : updateFragPTSDTS(details, frag, info.startPTS, info.endPTS, info.startDTS, info.endDTS);
        this.hls.trigger(Events.LEVEL_PTS_UPDATED, {
          details,
          level,
          drift,
          type,
          frag,
          start: info.startPTS,
          end: info.endPTS
        });
        return true;
      }
      return result;
    }, false);
    if (parsed) {
      level.fragmentError = 0;
    } else if (((_this$transmuxer = this.transmuxer) == null ? void 0 : _this$transmuxer.error) === null) {
      const error = new Error(`Found no media in fragment ${frag.sn} of level ${frag.level} resetting transmuxer to fallback to playlist timing`);
      if (level.fragmentError === 0) {
        // Mark and track the odd empty segment as a gap to avoid reloading
        level.fragmentError++;
        frag.gap = true;
        this.fragmentTracker.removeFragment(frag);
        this.fragmentTracker.fragBuffered(frag, true);
      }
      this.warn(error.message);
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.FRAG_PARSING_ERROR,
        fatal: false,
        error,
        frag,
        reason: `Found no media in msn ${frag.sn} of level "${level.url}"`
      });
      if (!this.hls) {
        return;
      }
      this.resetTransmuxer();
      // For this error fallthrough. Marking parsed will allow advancing to next fragment.
    }

    this.state = State.PARSED;
    this.hls.trigger(Events.FRAG_PARSED, {
      frag,
      part
    });
  }
  resetTransmuxer() {
    if (this.transmuxer) {
      this.transmuxer.destroy();
      this.transmuxer = null;
    }
  }
  recoverWorkerError(data) {
    if (data.event === 'demuxerWorker') {
      var _ref, _this$levelLastLoaded3, _this$fragCurrent3;
      this.fragmentTracker.removeAllFragments();
      this.resetTransmuxer();
      this.resetStartWhenNotLoaded((_ref = (_this$levelLastLoaded3 = this.levelLastLoaded) != null ? _this$levelLastLoaded3 : (_this$fragCurrent3 = this.fragCurrent) == null ? void 0 : _this$fragCurrent3.level) != null ? _ref : 0);
      this.resetLoadingState();
    }
  }
  set state(nextState) {
    const previousState = this._state;
    if (previousState !== nextState) {
      this._state = nextState;
      this.log(`${previousState}->${nextState}`);
    }
  }
  get state() {
    return this._state;
  }
}

function getSourceBuffer() {
  return self.SourceBuffer || self.WebKitSourceBuffer;
}

/**
 * @ignore
 */
function isSupported() {
  const mediaSource = getMediaSource();
  if (!mediaSource) {
    return false;
  }
  const sourceBuffer = getSourceBuffer();
  const isTypeSupported = mediaSource && typeof mediaSource.isTypeSupported === 'function' && mediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');

  // if SourceBuffer is exposed ensure its API is valid
  // Older browsers do not expose SourceBuffer globally so checking SourceBuffer.prototype is impossible
  const sourceBufferValidAPI = !sourceBuffer || sourceBuffer.prototype && typeof sourceBuffer.prototype.appendBuffer === 'function' && typeof sourceBuffer.prototype.remove === 'function';
  return !!isTypeSupported && !!sourceBufferValidAPI;
}

/**
 * @ignore
 */
function changeTypeSupported() {
  var _sourceBuffer$prototy;
  const sourceBuffer = getSourceBuffer();
  return typeof (sourceBuffer == null ? void 0 : (_sourceBuffer$prototy = sourceBuffer.prototype) == null ? void 0 : _sourceBuffer$prototy.changeType) === 'function';
}

// ensure the worker ends up in the bundle
// If the worker should not be included this gets aliased to empty.js
function hasUMDWorker() {
  return typeof __HLS_WORKER_BUNDLE__ === 'function';
}
function injectWorker() {
  const blob = new self.Blob([`var exports={};var module={exports:exports};function define(f){f()};define.amd=true;(${__HLS_WORKER_BUNDLE__.toString()})(true);`], {
    type: 'text/javascript'
  });
  const objectURL = self.URL.createObjectURL(blob);
  const worker = new self.Worker(objectURL);
  return {
    worker,
    objectURL
  };
}
function loadWorker(path) {
  const scriptURL = new self.URL(path, self.location.href).href;
  const worker = new self.Worker(scriptURL);
  return {
    worker,
    scriptURL
  };
}

function dummyTrack(type = '', inputTimeScale = 90000) {
  return {
    type,
    id: -1,
    pid: -1,
    inputTimeScale,
    sequenceNumber: -1,
    samples: [],
    dropped: 0
  };
}

class BaseAudioDemuxer {
  constructor() {
    this._audioTrack = void 0;
    this._id3Track = void 0;
    this.frameIndex = 0;
    this.cachedData = null;
    this.basePTS = null;
    this.initPTS = null;
    this.lastPTS = null;
  }
  resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
    this._id3Track = {
      type: 'id3',
      id: 3,
      pid: -1,
      inputTimeScale: 90000,
      sequenceNumber: 0,
      samples: [],
      dropped: 0
    };
  }
  resetTimeStamp(deaultTimestamp) {
    this.initPTS = deaultTimestamp;
    this.resetContiguity();
  }
  resetContiguity() {
    this.basePTS = null;
    this.lastPTS = null;
    this.frameIndex = 0;
  }
  canParse(data, offset) {
    return false;
  }
  appendFrame(track, data, offset) {}

  // feed incoming data to the front of the parsing pipeline
  demux(data, timeOffset) {
    if (this.cachedData) {
      data = appendUint8Array(this.cachedData, data);
      this.cachedData = null;
    }
    let id3Data = getID3Data(data, 0);
    let offset = id3Data ? id3Data.length : 0;
    let lastDataIndex;
    const track = this._audioTrack;
    const id3Track = this._id3Track;
    const timestamp = id3Data ? getTimeStamp(id3Data) : undefined;
    const length = data.length;
    if (this.basePTS === null || this.frameIndex === 0 && isFiniteNumber(timestamp)) {
      this.basePTS = initPTSFn(timestamp, timeOffset, this.initPTS);
      this.lastPTS = this.basePTS;
    }
    if (this.lastPTS === null) {
      this.lastPTS = this.basePTS;
    }

    // more expressive than alternative: id3Data?.length
    if (id3Data && id3Data.length > 0) {
      id3Track.samples.push({
        pts: this.lastPTS,
        dts: this.lastPTS,
        data: id3Data,
        type: MetadataSchema.audioId3,
        duration: Number.POSITIVE_INFINITY
      });
    }
    while (offset < length) {
      if (this.canParse(data, offset)) {
        const frame = this.appendFrame(track, data, offset);
        if (frame) {
          this.frameIndex++;
          this.lastPTS = frame.sample.pts;
          offset += frame.length;
          lastDataIndex = offset;
        } else {
          offset = length;
        }
      } else if (canParse$2(data, offset)) {
        // after a ID3.canParse, a call to ID3.getID3Data *should* always returns some data
        id3Data = getID3Data(data, offset);
        id3Track.samples.push({
          pts: this.lastPTS,
          dts: this.lastPTS,
          data: id3Data,
          type: MetadataSchema.audioId3,
          duration: Number.POSITIVE_INFINITY
        });
        offset += id3Data.length;
        lastDataIndex = offset;
      } else {
        offset++;
      }
      if (offset === length && lastDataIndex !== length) {
        const partialData = sliceUint8(data, lastDataIndex);
        if (this.cachedData) {
          this.cachedData = appendUint8Array(this.cachedData, partialData);
        } else {
          this.cachedData = partialData;
        }
      }
    }
    return {
      audioTrack: track,
      videoTrack: dummyTrack(),
      id3Track,
      textTrack: dummyTrack()
    };
  }
  demuxSampleAes(data, keyData, timeOffset) {
    return Promise.reject(new Error(`[${this}] This demuxer does not support Sample-AES decryption`));
  }
  flush(timeOffset) {
    // Parse cache in case of remaining frames.
    const cachedData = this.cachedData;
    if (cachedData) {
      this.cachedData = null;
      this.demux(cachedData, 0);
    }
    return {
      audioTrack: this._audioTrack,
      videoTrack: dummyTrack(),
      id3Track: this._id3Track,
      textTrack: dummyTrack()
    };
  }
  destroy() {}
}

/**
 * Initialize PTS
 * <p>
 *    use timestamp unless it is undefined, NaN or Infinity
 * </p>
 */
const initPTSFn = (timestamp, timeOffset, initPTS) => {
  if (isFiniteNumber(timestamp)) {
    return timestamp * 90;
  }
  const init90kHz = initPTS ? initPTS.baseTime * 90000 / initPTS.timescale : 0;
  return timeOffset * 90000 + init90kHz;
};

/**
 * ADTS parser helper
 * @link https://wiki.multimedia.cx/index.php?title=ADTS
 */
function getAudioConfig(observer, data, offset, audioCodec) {
  let adtsObjectType;
  let adtsExtensionSamplingIndex;
  let adtsChannelConfig;
  let config;
  const userAgent = navigator.userAgent.toLowerCase();
  const manifestCodec = audioCodec;
  const adtsSamplingRates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  // byte 2
  adtsObjectType = ((data[offset + 2] & 0xc0) >>> 6) + 1;
  const adtsSamplingIndex = (data[offset + 2] & 0x3c) >>> 2;
  if (adtsSamplingIndex > adtsSamplingRates.length - 1) {
    observer.trigger(Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.FRAG_PARSING_ERROR,
      fatal: true,
      reason: `invalid ADTS sampling index:${adtsSamplingIndex}`
    });
    return;
  }
  adtsChannelConfig = (data[offset + 2] & 0x01) << 2;
  // byte 3
  adtsChannelConfig |= (data[offset + 3] & 0xc0) >>> 6;
  logger.log(`manifest codec:${audioCodec}, ADTS type:${adtsObjectType}, samplingIndex:${adtsSamplingIndex}`);
  // firefox: freq less than 24kHz = AAC SBR (HE-AAC)
  if (/firefox/i.test(userAgent)) {
    if (adtsSamplingIndex >= 6) {
      adtsObjectType = 5;
      config = new Array(4);
      // HE-AAC uses SBR (Spectral Band Replication) , high frequencies are constructed from low frequencies
      // there is a factor 2 between frame sample rate and output sample rate
      // multiply frequency by 2 (see table below, equivalent to substract 3)
      adtsExtensionSamplingIndex = adtsSamplingIndex - 3;
    } else {
      adtsObjectType = 2;
      config = new Array(2);
      adtsExtensionSamplingIndex = adtsSamplingIndex;
    }
    // Android : always use AAC
  } else if (userAgent.indexOf('android') !== -1) {
    adtsObjectType = 2;
    config = new Array(2);
    adtsExtensionSamplingIndex = adtsSamplingIndex;
  } else {
    /*  for other browsers (Chrome/Vivaldi/Opera ...)
        always force audio type to be HE-AAC SBR, as some browsers do not support audio codec switch properly (like Chrome ...)
    */
    adtsObjectType = 5;
    config = new Array(4);
    // if (manifest codec is HE-AAC or HE-AACv2) OR (manifest codec not specified AND frequency less than 24kHz)
    if (audioCodec && (audioCodec.indexOf('mp4a.40.29') !== -1 || audioCodec.indexOf('mp4a.40.5') !== -1) || !audioCodec && adtsSamplingIndex >= 6) {
      // HE-AAC uses SBR (Spectral Band Replication) , high frequencies are constructed from low frequencies
      // there is a factor 2 between frame sample rate and output sample rate
      // multiply frequency by 2 (see table below, equivalent to substract 3)
      adtsExtensionSamplingIndex = adtsSamplingIndex - 3;
    } else {
      // if (manifest codec is AAC) AND (frequency less than 24kHz AND nb channel is 1) OR (manifest codec not specified and mono audio)
      // Chrome fails to play back with low frequency AAC LC mono when initialized with HE-AAC.  This is not a problem with stereo.
      if (audioCodec && audioCodec.indexOf('mp4a.40.2') !== -1 && (adtsSamplingIndex >= 6 && adtsChannelConfig === 1 || /vivaldi/i.test(userAgent)) || !audioCodec && adtsChannelConfig === 1) {
        adtsObjectType = 2;
        config = new Array(2);
      }
      adtsExtensionSamplingIndex = adtsSamplingIndex;
    }
  }
  /* refer to http://wiki.multimedia.cx/index.php?title=MPEG-4_Audio#Audio_Specific_Config
      ISO 14496-3 (AAC).pdf - Table 1.13 — Syntax of AudioSpecificConfig()
    Audio Profile / Audio Object Type
    0: Null
    1: AAC Main
    2: AAC LC (Low Complexity)
    3: AAC SSR (Scalable Sample Rate)
    4: AAC LTP (Long Term Prediction)
    5: SBR (Spectral Band Replication)
    6: AAC Scalable
   sampling freq
    0: 96000 Hz
    1: 88200 Hz
    2: 64000 Hz
    3: 48000 Hz
    4: 44100 Hz
    5: 32000 Hz
    6: 24000 Hz
    7: 22050 Hz
    8: 16000 Hz
    9: 12000 Hz
    10: 11025 Hz
    11: 8000 Hz
    12: 7350 Hz
    13: Reserved
    14: Reserved
    15: frequency is written explictly
    Channel Configurations
    These are the channel configurations:
    0: Defined in AOT Specifc Config
    1: 1 channel: front-center
    2: 2 channels: front-left, front-right
  */
  // audioObjectType = profile => profile, the MPEG-4 Audio Object Type minus 1
  config[0] = adtsObjectType << 3;
  // samplingFrequencyIndex
  config[0] |= (adtsSamplingIndex & 0x0e) >> 1;
  config[1] |= (adtsSamplingIndex & 0x01) << 7;
  // channelConfiguration
  config[1] |= adtsChannelConfig << 3;
  if (adtsObjectType === 5) {
    // adtsExtensionSamplingIndex
    config[1] |= (adtsExtensionSamplingIndex & 0x0e) >> 1;
    config[2] = (adtsExtensionSamplingIndex & 0x01) << 7;
    // adtsObjectType (force to 2, chrome is checking that object type is less than 5 ???
    //    https://chromium.googlesource.com/chromium/src.git/+/master/media/formats/mp4/aac.cc
    config[2] |= 2 << 2;
    config[3] = 0;
  }
  return {
    config,
    samplerate: adtsSamplingRates[adtsSamplingIndex],
    channelCount: adtsChannelConfig,
    codec: 'mp4a.40.' + adtsObjectType,
    manifestCodec
  };
}
function isHeaderPattern$1(data, offset) {
  return data[offset] === 0xff && (data[offset + 1] & 0xf6) === 0xf0;
}
function getHeaderLength(data, offset) {
  return data[offset + 1] & 0x01 ? 7 : 9;
}
function getFullFrameLength(data, offset) {
  return (data[offset + 3] & 0x03) << 11 | data[offset + 4] << 3 | (data[offset + 5] & 0xe0) >>> 5;
}
function canGetFrameLength(data, offset) {
  return offset + 5 < data.length;
}
function isHeader$1(data, offset) {
  // Look for ADTS header | 1111 1111 | 1111 X00X | where X can be either 0 or 1
  // Layer bits (position 14 and 15) in header should be always 0 for ADTS
  // More info https://wiki.multimedia.cx/index.php?title=ADTS
  return offset + 1 < data.length && isHeaderPattern$1(data, offset);
}
function canParse$1(data, offset) {
  return canGetFrameLength(data, offset) && isHeaderPattern$1(data, offset) && getFullFrameLength(data, offset) <= data.length - offset;
}
function probe$1(data, offset) {
  // same as isHeader but we also check that ADTS frame follows last ADTS frame
  // or end of data is reached
  if (isHeader$1(data, offset)) {
    // ADTS header Length
    const headerLength = getHeaderLength(data, offset);
    if (offset + headerLength >= data.length) {
      return false;
    }
    // ADTS frame Length
    const frameLength = getFullFrameLength(data, offset);
    if (frameLength <= headerLength) {
      return false;
    }
    const newOffset = offset + frameLength;
    return newOffset === data.length || isHeader$1(data, newOffset);
  }
  return false;
}
function initTrackConfig(track, observer, data, offset, audioCodec) {
  if (!track.samplerate) {
    const config = getAudioConfig(observer, data, offset, audioCodec);
    if (!config) {
      return;
    }
    track.config = config.config;
    track.samplerate = config.samplerate;
    track.channelCount = config.channelCount;
    track.codec = config.codec;
    track.manifestCodec = config.manifestCodec;
    logger.log(`parsed codec:${track.codec}, rate:${config.samplerate}, channels:${config.channelCount}`);
  }
}
function getFrameDuration(samplerate) {
  return 1024 * 90000 / samplerate;
}
function parseFrameHeader(data, offset) {
  // The protection skip bit tells us if we have 2 bytes of CRC data at the end of the ADTS header
  const headerLength = getHeaderLength(data, offset);
  if (offset + headerLength <= data.length) {
    // retrieve frame size
    const frameLength = getFullFrameLength(data, offset) - headerLength;
    if (frameLength > 0) {
      // logger.log(`AAC frame, offset/length/total/pts:${offset+headerLength}/${frameLength}/${data.byteLength}`);
      return {
        headerLength,
        frameLength
      };
    }
  }
}
function appendFrame$1(track, data, offset, pts, frameIndex) {
  const frameDuration = getFrameDuration(track.samplerate);
  const stamp = pts + frameIndex * frameDuration;
  const header = parseFrameHeader(data, offset);
  let unit;
  if (header) {
    const {
      frameLength,
      headerLength
    } = header;
    const _length = headerLength + frameLength;
    const missing = Math.max(0, offset + _length - data.length);
    // logger.log(`AAC frame ${frameIndex}, pts:${stamp} length@offset/total: ${frameLength}@${offset+headerLength}/${data.byteLength} missing: ${missing}`);
    if (missing) {
      unit = new Uint8Array(_length - headerLength);
      unit.set(data.subarray(offset + headerLength, data.length), 0);
    } else {
      unit = data.subarray(offset + headerLength, offset + _length);
    }
    const _sample = {
      unit,
      pts: stamp
    };
    if (!missing) {
      track.samples.push(_sample);
    }
    return {
      sample: _sample,
      length: _length,
      missing
    };
  }
  // overflow incomplete header
  const length = data.length - offset;
  unit = new Uint8Array(length);
  unit.set(data.subarray(offset, data.length), 0);
  const sample = {
    unit,
    pts: stamp
  };
  return {
    sample,
    length,
    missing: -1
  };
}

/**
 * AAC demuxer
 */
class AACDemuxer extends BaseAudioDemuxer {
  constructor(observer, config) {
    super();
    this.observer = void 0;
    this.config = void 0;
    this.observer = observer;
    this.config = config;
  }
  resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
    super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
    this._audioTrack = {
      container: 'audio/adts',
      type: 'audio',
      id: 2,
      pid: -1,
      sequenceNumber: 0,
      segmentCodec: 'aac',
      samples: [],
      manifestCodec: audioCodec,
      duration: trackDuration,
      inputTimeScale: 90000,
      dropped: 0
    };
  }

  // Source for probe info - https://wiki.multimedia.cx/index.php?title=ADTS
  static probe(data) {
    if (!data) {
      return false;
    }

    // Check for the ADTS sync word
    // Look for ADTS header | 1111 1111 | 1111 X00X | where X can be either 0 or 1
    // Layer bits (position 14 and 15) in header should be always 0 for ADTS
    // More info https://wiki.multimedia.cx/index.php?title=ADTS
    const id3Data = getID3Data(data, 0) || [];
    let offset = id3Data.length;
    for (let length = data.length; offset < length; offset++) {
      if (probe$1(data, offset)) {
        logger.log('ADTS sync word found !');
        return true;
      }
    }
    return false;
  }
  canParse(data, offset) {
    return canParse$1(data, offset);
  }
  appendFrame(track, data, offset) {
    initTrackConfig(track, this.observer, data, offset, track.manifestCodec);
    const frame = appendFrame$1(track, data, offset, this.basePTS, this.frameIndex);
    if (frame && frame.missing === 0) {
      return frame;
    }
  }
}

const emsgSchemePattern = /\/emsg[-/]ID3/i;
class MP4Demuxer {
  constructor(observer, config) {
    this.remainderData = null;
    this.timeOffset = 0;
    this.config = void 0;
    this.videoTrack = void 0;
    this.audioTrack = void 0;
    this.id3Track = void 0;
    this.txtTrack = void 0;
    this.config = config;
  }
  resetTimeStamp() {}
  resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
    const videoTrack = this.videoTrack = dummyTrack('video', 1);
    const audioTrack = this.audioTrack = dummyTrack('audio', 1);
    const captionTrack = this.txtTrack = dummyTrack('text', 1);
    this.id3Track = dummyTrack('id3', 1);
    this.timeOffset = 0;
    if (!(initSegment != null && initSegment.byteLength)) {
      return;
    }
    const initData = parseInitSegment(initSegment);
    if (initData.video) {
      const {
        id,
        timescale,
        codec
      } = initData.video;
      videoTrack.id = id;
      videoTrack.timescale = captionTrack.timescale = timescale;
      videoTrack.codec = codec;
    }
    if (initData.audio) {
      const {
        id,
        timescale,
        codec
      } = initData.audio;
      audioTrack.id = id;
      audioTrack.timescale = timescale;
      audioTrack.codec = codec;
    }
    captionTrack.id = RemuxerTrackIdConfig.text;
    videoTrack.sampleDuration = 0;
    videoTrack.duration = audioTrack.duration = trackDuration;
  }
  resetContiguity() {
    this.remainderData = null;
  }
  static probe(data) {
    // ensure we find a moof box in the first 16 kB
    data = data.length > 16384 ? data.subarray(0, 16384) : data;
    return findBox(data, ['moof']).length > 0;
  }
  demux(data, timeOffset) {
    this.timeOffset = timeOffset;
    // Load all data into the avc track. The CMAF remuxer will look for the data in the samples object; the rest of the fields do not matter
    let videoSamples = data;
    const videoTrack = this.videoTrack;
    const textTrack = this.txtTrack;
    if (this.config.progressive) {
      // Split the bytestream into two ranges: one encompassing all data up until the start of the last moof, and everything else.
      // This is done to guarantee that we're sending valid data to MSE - when demuxing progressively, we have no guarantee
      // that the fetch loader gives us flush moof+mdat pairs. If we push jagged data to MSE, it will throw an exception.
      if (this.remainderData) {
        videoSamples = appendUint8Array(this.remainderData, data);
      }
      const segmentedData = segmentValidRange(videoSamples);
      this.remainderData = segmentedData.remainder;
      videoTrack.samples = segmentedData.valid || new Uint8Array();
    } else {
      videoTrack.samples = videoSamples;
    }
    const id3Track = this.extractID3Track(videoTrack, timeOffset);
    textTrack.samples = parseSamples(timeOffset, videoTrack);
    return {
      videoTrack,
      audioTrack: this.audioTrack,
      id3Track,
      textTrack: this.txtTrack
    };
  }
  flush() {
    const timeOffset = this.timeOffset;
    const videoTrack = this.videoTrack;
    const textTrack = this.txtTrack;
    videoTrack.samples = this.remainderData || new Uint8Array();
    this.remainderData = null;
    const id3Track = this.extractID3Track(videoTrack, this.timeOffset);
    textTrack.samples = parseSamples(timeOffset, videoTrack);
    return {
      videoTrack,
      audioTrack: dummyTrack(),
      id3Track,
      textTrack: dummyTrack()
    };
  }
  extractID3Track(videoTrack, timeOffset) {
    const id3Track = this.id3Track;
    if (videoTrack.samples.length) {
      const emsgs = findBox(videoTrack.samples, ['emsg']);
      if (emsgs) {
        emsgs.forEach(data => {
          const emsgInfo = parseEmsg(data);
          if (emsgSchemePattern.test(emsgInfo.schemeIdUri)) {
            const pts = isFiniteNumber(emsgInfo.presentationTime) ? emsgInfo.presentationTime / emsgInfo.timeScale : timeOffset + emsgInfo.presentationTimeDelta / emsgInfo.timeScale;
            let duration = emsgInfo.eventDuration === 0xffffffff ? Number.POSITIVE_INFINITY : emsgInfo.eventDuration / emsgInfo.timeScale;
            // Safari takes anything <= 0.001 seconds and maps it to Infinity
            if (duration <= 0.001) {
              duration = Number.POSITIVE_INFINITY;
            }
            const payload = emsgInfo.payload;
            id3Track.samples.push({
              data: payload,
              len: payload.byteLength,
              dts: pts,
              pts: pts,
              type: MetadataSchema.emsg,
              duration: duration
            });
          }
        });
      }
    }
    return id3Track;
  }
  demuxSampleAes(data, keyData, timeOffset) {
    return Promise.reject(new Error('The MP4 demuxer does not support SAMPLE-AES decryption'));
  }
  destroy() {}
}

/**
 *  MPEG parser helper
 */

let chromeVersion$1 = null;
const BitratesMap = [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SamplingRateMap = [44100, 48000, 32000, 22050, 24000, 16000, 11025, 12000, 8000];
const SamplesCoefficients = [
// MPEG 2.5
[0,
// Reserved
72,
// Layer3
144,
// Layer2
12 // Layer1
],
// Reserved
[0,
// Reserved
0,
// Layer3
0,
// Layer2
0 // Layer1
],
// MPEG 2
[0,
// Reserved
72,
// Layer3
144,
// Layer2
12 // Layer1
],
// MPEG 1
[0,
// Reserved
144,
// Layer3
144,
// Layer2
12 // Layer1
]];

const BytesInSlot = [0,
// Reserved
1,
// Layer3
1,
// Layer2
4 // Layer1
];

function appendFrame(track, data, offset, pts, frameIndex) {
  // Using http://www.datavoyage.com/mpgscript/mpeghdr.htm as a reference
  if (offset + 24 > data.length) {
    return;
  }
  const header = parseHeader(data, offset);
  if (header && offset + header.frameLength <= data.length) {
    const frameDuration = header.samplesPerFrame * 90000 / header.sampleRate;
    const stamp = pts + frameIndex * frameDuration;
    const sample = {
      unit: data.subarray(offset, offset + header.frameLength),
      pts: stamp,
      dts: stamp
    };
    track.config = [];
    track.channelCount = header.channelCount;
    track.samplerate = header.sampleRate;
    track.samples.push(sample);
    return {
      sample,
      length: header.frameLength,
      missing: 0
    };
  }
}
function parseHeader(data, offset) {
  const mpegVersion = data[offset + 1] >> 3 & 3;
  const mpegLayer = data[offset + 1] >> 1 & 3;
  const bitRateIndex = data[offset + 2] >> 4 & 15;
  const sampleRateIndex = data[offset + 2] >> 2 & 3;
  if (mpegVersion !== 1 && bitRateIndex !== 0 && bitRateIndex !== 15 && sampleRateIndex !== 3) {
    const paddingBit = data[offset + 2] >> 1 & 1;
    const channelMode = data[offset + 3] >> 6;
    const columnInBitrates = mpegVersion === 3 ? 3 - mpegLayer : mpegLayer === 3 ? 3 : 4;
    const bitRate = BitratesMap[columnInBitrates * 14 + bitRateIndex - 1] * 1000;
    const columnInSampleRates = mpegVersion === 3 ? 0 : mpegVersion === 2 ? 1 : 2;
    const sampleRate = SamplingRateMap[columnInSampleRates * 3 + sampleRateIndex];
    const channelCount = channelMode === 3 ? 1 : 2; // If bits of channel mode are `11` then it is a single channel (Mono)
    const sampleCoefficient = SamplesCoefficients[mpegVersion][mpegLayer];
    const bytesInSlot = BytesInSlot[mpegLayer];
    const samplesPerFrame = sampleCoefficient * 8 * bytesInSlot;
    const frameLength = Math.floor(sampleCoefficient * bitRate / sampleRate + paddingBit) * bytesInSlot;
    if (chromeVersion$1 === null) {
      const userAgent = navigator.userAgent || '';
      const result = userAgent.match(/Chrome\/(\d+)/i);
      chromeVersion$1 = result ? parseInt(result[1]) : 0;
    }
    const needChromeFix = !!chromeVersion$1 && chromeVersion$1 <= 87;
    if (needChromeFix && mpegLayer === 2 && bitRate >= 224000 && channelMode === 0) {
      // Work around bug in Chromium by setting channelMode to dual-channel (01) instead of stereo (00)
      data[offset + 3] = data[offset + 3] | 0x80;
    }
    return {
      sampleRate,
      channelCount,
      frameLength,
      samplesPerFrame
    };
  }
}
function isHeaderPattern(data, offset) {
  return data[offset] === 0xff && (data[offset + 1] & 0xe0) === 0xe0 && (data[offset + 1] & 0x06) !== 0x00;
}
function isHeader(data, offset) {
  // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
  // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
  // More info http://www.mp3-tech.org/programmer/frame_header.html
  return offset + 1 < data.length && isHeaderPattern(data, offset);
}
function canParse(data, offset) {
  const headerSize = 4;
  return isHeaderPattern(data, offset) && headerSize <= data.length - offset;
}
function probe(data, offset) {
  // same as isHeader but we also check that MPEG frame follows last MPEG frame
  // or end of data is reached
  if (offset + 1 < data.length && isHeaderPattern(data, offset)) {
    // MPEG header Length
    const headerLength = 4;
    // MPEG frame Length
    const header = parseHeader(data, offset);
    let frameLength = headerLength;
    if (header != null && header.frameLength) {
      frameLength = header.frameLength;
    }
    const newOffset = offset + frameLength;
    return newOffset === data.length || isHeader(data, newOffset);
  }
  return false;
}

/**
 * Parser for exponential Golomb codes, a variable-bitwidth number encoding scheme used by h264.
 */

class ExpGolomb {
  constructor(data) {
    this.data = void 0;
    this.bytesAvailable = void 0;
    this.word = void 0;
    this.bitsAvailable = void 0;
    this.data = data;
    // the number of bytes left to examine in this.data
    this.bytesAvailable = data.byteLength;
    // the current word being examined
    this.word = 0; // :uint
    // the number of bits left to examine in the current word
    this.bitsAvailable = 0; // :uint
  }

  // ():void
  loadWord() {
    const data = this.data;
    const bytesAvailable = this.bytesAvailable;
    const position = data.byteLength - bytesAvailable;
    const workingBytes = new Uint8Array(4);
    const availableBytes = Math.min(4, bytesAvailable);
    if (availableBytes === 0) {
      throw new Error('no bytes available');
    }
    workingBytes.set(data.subarray(position, position + availableBytes));
    this.word = new DataView(workingBytes.buffer).getUint32(0);
    // track the amount of this.data that has been processed
    this.bitsAvailable = availableBytes * 8;
    this.bytesAvailable -= availableBytes;
  }

  // (count:int):void
  skipBits(count) {
    let skipBytes; // :int
    count = Math.min(count, this.bytesAvailable * 8 + this.bitsAvailable);
    if (this.bitsAvailable > count) {
      this.word <<= count;
      this.bitsAvailable -= count;
    } else {
      count -= this.bitsAvailable;
      skipBytes = count >> 3;
      count -= skipBytes << 3;
      this.bytesAvailable -= skipBytes;
      this.loadWord();
      this.word <<= count;
      this.bitsAvailable -= count;
    }
  }

  // (size:int):uint
  readBits(size) {
    let bits = Math.min(this.bitsAvailable, size); // :uint
    const valu = this.word >>> 32 - bits; // :uint
    if (size > 32) {
      logger.error('Cannot read more than 32 bits at a time');
    }
    this.bitsAvailable -= bits;
    if (this.bitsAvailable > 0) {
      this.word <<= bits;
    } else if (this.bytesAvailable > 0) {
      this.loadWord();
    } else {
      throw new Error('no bits available');
    }
    bits = size - bits;
    if (bits > 0 && this.bitsAvailable) {
      return valu << bits | this.readBits(bits);
    } else {
      return valu;
    }
  }

  // ():uint
  skipLZ() {
    let leadingZeroCount; // :uint
    for (leadingZeroCount = 0; leadingZeroCount < this.bitsAvailable; ++leadingZeroCount) {
      if ((this.word & 0x80000000 >>> leadingZeroCount) !== 0) {
        // the first bit of working word is 1
        this.word <<= leadingZeroCount;
        this.bitsAvailable -= leadingZeroCount;
        return leadingZeroCount;
      }
    }
    // we exhausted word and still have not found a 1
    this.loadWord();
    return leadingZeroCount + this.skipLZ();
  }

  // ():void
  skipUEG() {
    this.skipBits(1 + this.skipLZ());
  }

  // ():void
  skipEG() {
    this.skipBits(1 + this.skipLZ());
  }

  // ():uint
  readUEG() {
    const clz = this.skipLZ(); // :uint
    return this.readBits(clz + 1) - 1;
  }

  // ():int
  readEG() {
    const valu = this.readUEG(); // :int
    if (0x01 & valu) {
      // the number is odd if the low order bit is set
      return 1 + valu >>> 1; // add 1 to make it even, and divide by 2
    } else {
      return -1 * (valu >>> 1); // divide by two then make it negative
    }
  }

  // Some convenience functions
  // :Boolean
  readBoolean() {
    return this.readBits(1) === 1;
  }

  // ():int
  readUByte() {
    return this.readBits(8);
  }

  // ():int
  readUShort() {
    return this.readBits(16);
  }

  // ():int
  readUInt() {
    return this.readBits(32);
  }

  /**
   * Advance the ExpGolomb decoder past a scaling list. The scaling
   * list is optionally transmitted as part of a sequence parameter
   * set and is not relevant to transmuxing.
   * @param count the number of entries in this scaling list
   * @see Recommendation ITU-T H.264, Section 7.3.2.1.1.1
   */
  skipScalingList(count) {
    let lastScale = 8;
    let nextScale = 8;
    let deltaScale;
    for (let j = 0; j < count; j++) {
      if (nextScale !== 0) {
        deltaScale = this.readEG();
        nextScale = (lastScale + deltaScale + 256) % 256;
      }
      lastScale = nextScale === 0 ? lastScale : nextScale;
    }
  }

  /**
   * Read a sequence parameter set and return some interesting video
   * properties. A sequence parameter set is the H264 metadata that
   * describes the properties of upcoming video frames.
   * @returns an object with configuration parsed from the
   * sequence parameter set, including the dimensions of the
   * associated video frames.
   */
  readSPS() {
    let frameCropLeftOffset = 0;
    let frameCropRightOffset = 0;
    let frameCropTopOffset = 0;
    let frameCropBottomOffset = 0;
    let numRefFramesInPicOrderCntCycle;
    let scalingListCount;
    let i;
    const readUByte = this.readUByte.bind(this);
    const readBits = this.readBits.bind(this);
    const readUEG = this.readUEG.bind(this);
    const readBoolean = this.readBoolean.bind(this);
    const skipBits = this.skipBits.bind(this);
    const skipEG = this.skipEG.bind(this);
    const skipUEG = this.skipUEG.bind(this);
    const skipScalingList = this.skipScalingList.bind(this);
    readUByte();
    const profileIdc = readUByte(); // profile_idc
    readBits(5); // profileCompat constraint_set[0-4]_flag, u(5)
    skipBits(3); // reserved_zero_3bits u(3),
    readUByte(); // level_idc u(8)
    skipUEG(); // seq_parameter_set_id
    // some profiles have more optional data we don't need
    if (profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244 || profileIdc === 44 || profileIdc === 83 || profileIdc === 86 || profileIdc === 118 || profileIdc === 128) {
      const chromaFormatIdc = readUEG();
      if (chromaFormatIdc === 3) {
        skipBits(1);
      } // separate_colour_plane_flag

      skipUEG(); // bit_depth_luma_minus8
      skipUEG(); // bit_depth_chroma_minus8
      skipBits(1); // qpprime_y_zero_transform_bypass_flag
      if (readBoolean()) {
        // seq_scaling_matrix_present_flag
        scalingListCount = chromaFormatIdc !== 3 ? 8 : 12;
        for (i = 0; i < scalingListCount; i++) {
          if (readBoolean()) {
            // seq_scaling_list_present_flag[ i ]
            if (i < 6) {
              skipScalingList(16);
            } else {
              skipScalingList(64);
            }
          }
        }
      }
    }
    skipUEG(); // log2_max_frame_num_minus4
    const picOrderCntType = readUEG();
    if (picOrderCntType === 0) {
      readUEG(); // log2_max_pic_order_cnt_lsb_minus4
    } else if (picOrderCntType === 1) {
      skipBits(1); // delta_pic_order_always_zero_flag
      skipEG(); // offset_for_non_ref_pic
      skipEG(); // offset_for_top_to_bottom_field
      numRefFramesInPicOrderCntCycle = readUEG();
      for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
        skipEG();
      } // offset_for_ref_frame[ i ]
    }

    skipUEG(); // max_num_ref_frames
    skipBits(1); // gaps_in_frame_num_value_allowed_flag
    const picWidthInMbsMinus1 = readUEG();
    const picHeightInMapUnitsMinus1 = readUEG();
    const frameMbsOnlyFlag = readBits(1);
    if (frameMbsOnlyFlag === 0) {
      skipBits(1);
    } // mb_adaptive_frame_field_flag

    skipBits(1); // direct_8x8_inference_flag
    if (readBoolean()) {
      // frame_cropping_flag
      frameCropLeftOffset = readUEG();
      frameCropRightOffset = readUEG();
      frameCropTopOffset = readUEG();
      frameCropBottomOffset = readUEG();
    }
    let pixelRatio = [1, 1];
    if (readBoolean()) {
      // vui_parameters_present_flag
      if (readBoolean()) {
        // aspect_ratio_info_present_flag
        const aspectRatioIdc = readUByte();
        switch (aspectRatioIdc) {
          case 1:
            pixelRatio = [1, 1];
            break;
          case 2:
            pixelRatio = [12, 11];
            break;
          case 3:
            pixelRatio = [10, 11];
            break;
          case 4:
            pixelRatio = [16, 11];
            break;
          case 5:
            pixelRatio = [40, 33];
            break;
          case 6:
            pixelRatio = [24, 11];
            break;
          case 7:
            pixelRatio = [20, 11];
            break;
          case 8:
            pixelRatio = [32, 11];
            break;
          case 9:
            pixelRatio = [80, 33];
            break;
          case 10:
            pixelRatio = [18, 11];
            break;
          case 11:
            pixelRatio = [15, 11];
            break;
          case 12:
            pixelRatio = [64, 33];
            break;
          case 13:
            pixelRatio = [160, 99];
            break;
          case 14:
            pixelRatio = [4, 3];
            break;
          case 15:
            pixelRatio = [3, 2];
            break;
          case 16:
            pixelRatio = [2, 1];
            break;
          case 255:
            {
              pixelRatio = [readUByte() << 8 | readUByte(), readUByte() << 8 | readUByte()];
              break;
            }
        }
      }
    }
    return {
      width: Math.ceil((picWidthInMbsMinus1 + 1) * 16 - frameCropLeftOffset * 2 - frameCropRightOffset * 2),
      height: (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16 - (frameMbsOnlyFlag ? 2 : 4) * (frameCropTopOffset + frameCropBottomOffset),
      pixelRatio: pixelRatio
    };
  }
  readSliceType() {
    // skip NALu type
    this.readUByte();
    // discard first_mb_in_slice
    this.readUEG();
    // return slice_type
    return this.readUEG();
  }
}

/**
 * SAMPLE-AES decrypter
 */

class SampleAesDecrypter {
  constructor(observer, config, keyData) {
    this.keyData = void 0;
    this.decrypter = void 0;
    this.keyData = keyData;
    this.decrypter = new Decrypter(config, {
      removePKCS7Padding: false
    });
  }
  decryptBuffer(encryptedData) {
    return this.decrypter.decrypt(encryptedData, this.keyData.key.buffer, this.keyData.iv.buffer);
  }

  // AAC - encrypt all full 16 bytes blocks starting from offset 16
  decryptAacSample(samples, sampleIndex, callback) {
    const curUnit = samples[sampleIndex].unit;
    if (curUnit.length <= 16) {
      // No encrypted portion in this sample (first 16 bytes is not
      // encrypted, see https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/HLS_Sample_Encryption/Encryption/Encryption.html),
      return;
    }
    const encryptedData = curUnit.subarray(16, curUnit.length - curUnit.length % 16);
    const encryptedBuffer = encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.length);
    this.decryptBuffer(encryptedBuffer).then(decryptedBuffer => {
      const decryptedData = new Uint8Array(decryptedBuffer);
      curUnit.set(decryptedData, 16);
      if (!this.decrypter.isSync()) {
        this.decryptAacSamples(samples, sampleIndex + 1, callback);
      }
    });
  }
  decryptAacSamples(samples, sampleIndex, callback) {
    for (;; sampleIndex++) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }
      if (samples[sampleIndex].unit.length < 32) {
        continue;
      }
      this.decryptAacSample(samples, sampleIndex, callback);
      if (!this.decrypter.isSync()) {
        return;
      }
    }
  }

  // AVC - encrypt one 16 bytes block out of ten, starting from offset 32
  getAvcEncryptedData(decodedData) {
    const encryptedDataLen = Math.floor((decodedData.length - 48) / 160) * 16 + 16;
    const encryptedData = new Int8Array(encryptedDataLen);
    let outputPos = 0;
    for (let inputPos = 32; inputPos < decodedData.length - 16; inputPos += 160, outputPos += 16) {
      encryptedData.set(decodedData.subarray(inputPos, inputPos + 16), outputPos);
    }
    return encryptedData;
  }
  getAvcDecryptedUnit(decodedData, decryptedData) {
    const uint8DecryptedData = new Uint8Array(decryptedData);
    let inputPos = 0;
    for (let outputPos = 32; outputPos < decodedData.length - 16; outputPos += 160, inputPos += 16) {
      decodedData.set(uint8DecryptedData.subarray(inputPos, inputPos + 16), outputPos);
    }
    return decodedData;
  }
  decryptAvcSample(samples, sampleIndex, unitIndex, callback, curUnit) {
    const decodedData = discardEPB(curUnit.data);
    const encryptedData = this.getAvcEncryptedData(decodedData);
    this.decryptBuffer(encryptedData.buffer).then(decryptedBuffer => {
      curUnit.data = this.getAvcDecryptedUnit(decodedData, decryptedBuffer);
      if (!this.decrypter.isSync()) {
        this.decryptAvcSamples(samples, sampleIndex, unitIndex + 1, callback);
      }
    });
  }
  decryptAvcSamples(samples, sampleIndex, unitIndex, callback) {
    if (samples instanceof Uint8Array) {
      throw new Error('Cannot decrypt samples of type Uint8Array');
    }
    for (;; sampleIndex++, unitIndex = 0) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }
      const curUnits = samples[sampleIndex].units;
      for (;; unitIndex++) {
        if (unitIndex >= curUnits.length) {
          break;
        }
        const curUnit = curUnits[unitIndex];
        if (curUnit.data.length <= 48 || curUnit.type !== 1 && curUnit.type !== 5) {
          continue;
        }
        this.decryptAvcSample(samples, sampleIndex, unitIndex, callback, curUnit);
        if (!this.decrypter.isSync()) {
          return;
        }
      }
    }
  }
}

const PACKET_LENGTH = 188;
class TSDemuxer {
  constructor(observer, config, typeSupported) {
    this.observer = void 0;
    this.config = void 0;
    this.typeSupported = void 0;
    this.sampleAes = null;
    this.pmtParsed = false;
    this.audioCodec = void 0;
    this.videoCodec = void 0;
    this._duration = 0;
    this._pmtId = -1;
    this._avcTrack = void 0;
    this._audioTrack = void 0;
    this._id3Track = void 0;
    this._txtTrack = void 0;
    this.aacOverFlow = null;
    this.avcSample = null;
    this.remainderData = null;
    this.observer = observer;
    this.config = config;
    this.typeSupported = typeSupported;
  }
  static probe(data) {
    const syncOffset = TSDemuxer.syncOffset(data);
    if (syncOffset > 0) {
      logger.warn(`MPEG2-TS detected but first sync word found @ offset ${syncOffset}`);
    }
    return syncOffset !== -1;
  }
  static syncOffset(data) {
    const length = data.length;
    let scanwindow = Math.min(PACKET_LENGTH * 5, data.length - PACKET_LENGTH) + 1;
    let i = 0;
    while (i < scanwindow) {
      // a TS init segment should contain at least 2 TS packets: PAT and PMT, each starting with 0x47
      let foundPat = false;
      let packetStart = -1;
      let tsPackets = 0;
      for (let j = i; j < length; j += PACKET_LENGTH) {
        if (data[j] === 0x47) {
          tsPackets++;
          if (packetStart === -1) {
            packetStart = j;
            // First sync word found at offset, increase scan length (#5251)
            if (packetStart !== 0) {
              scanwindow = Math.min(packetStart + PACKET_LENGTH * 99, data.length - PACKET_LENGTH) + 1;
            }
          }
          if (!foundPat) {
            foundPat = parsePID(data, j) === 0;
          }
          // Sync word found at 0 with 3 packets, or found at offset least 2 packets up to scanwindow (#5501)
          if (foundPat && tsPackets > 1 && (packetStart === 0 && tsPackets > 2 || j + PACKET_LENGTH > scanwindow)) {
            return packetStart;
          }
        } else if (tsPackets) {
          // Exit if sync word found, but does not contain contiguous packets (#5501)
          return -1;
        } else {
          break;
        }
      }
      i++;
    }
    return -1;
  }

  /**
   * Creates a track model internal to demuxer used to drive remuxing input
   */
  static createTrack(type, duration) {
    return {
      container: type === 'video' || type === 'audio' ? 'video/mp2t' : undefined,
      type,
      id: RemuxerTrackIdConfig[type],
      pid: -1,
      inputTimeScale: 90000,
      sequenceNumber: 0,
      samples: [],
      dropped: 0,
      duration: type === 'audio' ? duration : undefined
    };
  }

  /**
   * Initializes a new init segment on the demuxer/remuxer interface. Needed for discontinuities/track-switches (or at stream start)
   * Resets all internal track instances of the demuxer.
   */
  resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
    this.pmtParsed = false;
    this._pmtId = -1;
    this._avcTrack = TSDemuxer.createTrack('video');
    this._audioTrack = TSDemuxer.createTrack('audio', trackDuration);
    this._id3Track = TSDemuxer.createTrack('id3');
    this._txtTrack = TSDemuxer.createTrack('text');
    this._audioTrack.segmentCodec = 'aac';

    // flush any partial content
    this.aacOverFlow = null;
    this.avcSample = null;
    this.remainderData = null;
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this._duration = trackDuration;
  }
  resetTimeStamp() {}
  resetContiguity() {
    const {
      _audioTrack,
      _avcTrack,
      _id3Track
    } = this;
    if (_audioTrack) {
      _audioTrack.pesData = null;
    }
    if (_avcTrack) {
      _avcTrack.pesData = null;
    }
    if (_id3Track) {
      _id3Track.pesData = null;
    }
    this.aacOverFlow = null;
    this.avcSample = null;
    this.remainderData = null;
  }
  demux(data, timeOffset, isSampleAes = false, flush = false) {
    if (!isSampleAes) {
      this.sampleAes = null;
    }
    let pes;
    const videoTrack = this._avcTrack;
    const audioTrack = this._audioTrack;
    const id3Track = this._id3Track;
    const textTrack = this._txtTrack;
    let avcId = videoTrack.pid;
    let avcData = videoTrack.pesData;
    let audioId = audioTrack.pid;
    let id3Id = id3Track.pid;
    let audioData = audioTrack.pesData;
    let id3Data = id3Track.pesData;
    let unknownPID = null;
    let pmtParsed = this.pmtParsed;
    let pmtId = this._pmtId;
    let len = data.length;
    if (this.remainderData) {
      data = appendUint8Array(this.remainderData, data);
      len = data.length;
      this.remainderData = null;
    }
    if (len < PACKET_LENGTH && !flush) {
      this.remainderData = data;
      return {
        audioTrack,
        videoTrack,
        id3Track,
        textTrack
      };
    }
    const syncOffset = Math.max(0, TSDemuxer.syncOffset(data));
    len -= (len - syncOffset) % PACKET_LENGTH;
    if (len < data.byteLength && !flush) {
      this.remainderData = new Uint8Array(data.buffer, len, data.buffer.byteLength - len);
    }

    // loop through TS packets
    let tsPacketErrors = 0;
    for (let start = syncOffset; start < len; start += PACKET_LENGTH) {
      if (data[start] === 0x47) {
        const stt = !!(data[start + 1] & 0x40);
        const pid = parsePID(data, start);
        const atf = (data[start + 3] & 0x30) >> 4;

        // if an adaption field is present, its length is specified by the fifth byte of the TS packet header.
        let offset;
        if (atf > 1) {
          offset = start + 5 + data[start + 4];
          // continue if there is only adaptation field
          if (offset === start + PACKET_LENGTH) {
            continue;
          }
        } else {
          offset = start + 4;
        }
        switch (pid) {
          case avcId:
            if (stt) {
              if (avcData && (pes = parsePES(avcData))) {
                this.parseAVCPES(videoTrack, textTrack, pes, false);
              }
              avcData = {
                data: [],
                size: 0
              };
            }
            if (avcData) {
              avcData.data.push(data.subarray(offset, start + PACKET_LENGTH));
              avcData.size += start + PACKET_LENGTH - offset;
            }
            break;
          case audioId:
            if (stt) {
              if (audioData && (pes = parsePES(audioData))) {
                switch (audioTrack.segmentCodec) {
                  case 'aac':
                    this.parseAACPES(audioTrack, pes);
                    break;
                  case 'mp3':
                    this.parseMPEGPES(audioTrack, pes);
                    break;
                }
              }
              audioData = {
                data: [],
                size: 0
              };
            }
            if (audioData) {
              audioData.data.push(data.subarray(offset, start + PACKET_LENGTH));
              audioData.size += start + PACKET_LENGTH - offset;
            }
            break;
          case id3Id:
            if (stt) {
              if (id3Data && (pes = parsePES(id3Data))) {
                this.parseID3PES(id3Track, pes);
              }
              id3Data = {
                data: [],
                size: 0
              };
            }
            if (id3Data) {
              id3Data.data.push(data.subarray(offset, start + PACKET_LENGTH));
              id3Data.size += start + PACKET_LENGTH - offset;
            }
            break;
          case 0:
            if (stt) {
              offset += data[offset] + 1;
            }
            pmtId = this._pmtId = parsePAT(data, offset);
            // logger.log('PMT PID:'  + this._pmtId);
            break;
          case pmtId:
            {
              if (stt) {
                offset += data[offset] + 1;
              }
              const parsedPIDs = parsePMT(data, offset, this.typeSupported, isSampleAes);

              // only update track id if track PID found while parsing PMT
              // this is to avoid resetting the PID to -1 in case
              // track PID transiently disappears from the stream
              // this could happen in case of transient missing audio samples for example
              // NOTE this is only the PID of the track as found in TS,
              // but we are not using this for MP4 track IDs.
              avcId = parsedPIDs.avc;
              if (avcId > 0) {
                videoTrack.pid = avcId;
              }
              audioId = parsedPIDs.audio;
              if (audioId > 0) {
                audioTrack.pid = audioId;
                audioTrack.segmentCodec = parsedPIDs.segmentCodec;
              }
              id3Id = parsedPIDs.id3;
              if (id3Id > 0) {
                id3Track.pid = id3Id;
              }
              if (unknownPID !== null && !pmtParsed) {
                logger.warn(`MPEG-TS PMT found at ${start} after unknown PID '${unknownPID}'. Backtracking to sync byte @${syncOffset} to parse all TS packets.`);
                unknownPID = null;
                // we set it to -188, the += 188 in the for loop will reset start to 0
                start = syncOffset - 188;
              }
              pmtParsed = this.pmtParsed = true;
              break;
            }
          case 0x11:
          case 0x1fff:
            break;
          default:
            unknownPID = pid;
            break;
        }
      } else {
        tsPacketErrors++;
      }
    }
    if (tsPacketErrors > 0) {
      const error = new Error(`Found ${tsPacketErrors} TS packet/s that do not start with 0x47`);
      this.observer.emit(Events.ERROR, Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.FRAG_PARSING_ERROR,
        fatal: false,
        error,
        reason: error.message
      });
    }
    videoTrack.pesData = avcData;
    audioTrack.pesData = audioData;
    id3Track.pesData = id3Data;
    const demuxResult = {
      audioTrack,
      videoTrack,
      id3Track,
      textTrack
    };
    if (flush) {
      this.extractRemainingSamples(demuxResult);
    }
    return demuxResult;
  }
  flush() {
    const {
      remainderData
    } = this;
    this.remainderData = null;
    let result;
    if (remainderData) {
      result = this.demux(remainderData, -1, false, true);
    } else {
      result = {
        videoTrack: this._avcTrack,
        audioTrack: this._audioTrack,
        id3Track: this._id3Track,
        textTrack: this._txtTrack
      };
    }
    this.extractRemainingSamples(result);
    if (this.sampleAes) {
      return this.decrypt(result, this.sampleAes);
    }
    return result;
  }
  extractRemainingSamples(demuxResult) {
    const {
      audioTrack,
      videoTrack,
      id3Track,
      textTrack
    } = demuxResult;
    const avcData = videoTrack.pesData;
    const audioData = audioTrack.pesData;
    const id3Data = id3Track.pesData;
    // try to parse last PES packets
    let pes;
    if (avcData && (pes = parsePES(avcData))) {
      this.parseAVCPES(videoTrack, textTrack, pes, true);
      videoTrack.pesData = null;
    } else {
      // either avcData null or PES truncated, keep it for next frag parsing
      videoTrack.pesData = avcData;
    }
    if (audioData && (pes = parsePES(audioData))) {
      switch (audioTrack.segmentCodec) {
        case 'aac':
          this.parseAACPES(audioTrack, pes);
          break;
        case 'mp3':
          this.parseMPEGPES(audioTrack, pes);
          break;
      }
      audioTrack.pesData = null;
    } else {
      if (audioData != null && audioData.size) {
        logger.log('last AAC PES packet truncated,might overlap between fragments');
      }

      // either audioData null or PES truncated, keep it for next frag parsing
      audioTrack.pesData = audioData;
    }
    if (id3Data && (pes = parsePES(id3Data))) {
      this.parseID3PES(id3Track, pes);
      id3Track.pesData = null;
    } else {
      // either id3Data null or PES truncated, keep it for next frag parsing
      id3Track.pesData = id3Data;
    }
  }
  demuxSampleAes(data, keyData, timeOffset) {
    const demuxResult = this.demux(data, timeOffset, true, !this.config.progressive);
    const sampleAes = this.sampleAes = new SampleAesDecrypter(this.observer, this.config, keyData);
    return this.decrypt(demuxResult, sampleAes);
  }
  decrypt(demuxResult, sampleAes) {
    return new Promise(resolve => {
      const {
        audioTrack,
        videoTrack
      } = demuxResult;
      if (audioTrack.samples && audioTrack.segmentCodec === 'aac') {
        sampleAes.decryptAacSamples(audioTrack.samples, 0, () => {
          if (videoTrack.samples) {
            sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
              resolve(demuxResult);
            });
          } else {
            resolve(demuxResult);
          }
        });
      } else if (videoTrack.samples) {
        sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
          resolve(demuxResult);
        });
      }
    });
  }
  destroy() {
    this._duration = 0;
  }
  parseAVCPES(track, textTrack, pes, last) {
    const units = this.parseAVCNALu(track, pes.data);
    let avcSample = this.avcSample;
    let push;
    let spsfound = false;
    // free pes.data to save up some memory
    pes.data = null;

    // if new NAL units found and last sample still there, let's push ...
    // this helps parsing streams with missing AUD (only do this if AUD never found)
    if (avcSample && units.length && !track.audFound) {
      pushAccessUnit(avcSample, track);
      avcSample = this.avcSample = createAVCSample(false, pes.pts, pes.dts, '');
    }
    units.forEach(unit => {
      var _avcSample2;
      switch (unit.type) {
        // NDR
        case 1:
          {
            let iskey = false;
            push = true;
            const data = unit.data;
            // only check slice type to detect KF in case SPS found in same packet (any keyframe is preceded by SPS ...)
            if (spsfound && data.length > 4) {
              // retrieve slice type by parsing beginning of NAL unit (follow H264 spec, slice_header definition) to detect keyframe embedded in NDR
              const sliceType = new ExpGolomb(data).readSliceType();
              // 2 : I slice, 4 : SI slice, 7 : I slice, 9: SI slice
              // SI slice : A slice that is coded using intra prediction only and using quantisation of the prediction samples.
              // An SI slice can be coded such that its decoded samples can be constructed identically to an SP slice.
              // I slice: A slice that is not an SI slice that is decoded using intra prediction only.
              // if (sliceType === 2 || sliceType === 7) {
              if (sliceType === 2 || sliceType === 4 || sliceType === 7 || sliceType === 9) {
                iskey = true;
              }
            }
            if (iskey) {
              var _avcSample;
              // if we have non-keyframe data already, that cannot belong to the same frame as a keyframe, so force a push
              if ((_avcSample = avcSample) != null && _avcSample.frame && !avcSample.key) {
                pushAccessUnit(avcSample, track);
                avcSample = this.avcSample = null;
              }
            }
            if (!avcSample) {
              avcSample = this.avcSample = createAVCSample(true, pes.pts, pes.dts, '');
            }
            avcSample.frame = true;
            avcSample.key = iskey;
            break;
            // IDR
          }

        case 5:
          push = true;
          // handle PES not starting with AUD
          // if we have non-keyframe data already, that cannot belong to the same frame as a keyframe, so force a push
          if ((_avcSample2 = avcSample) != null && _avcSample2.frame && !avcSample.key) {
            pushAccessUnit(avcSample, track);
            avcSample = this.avcSample = null;
          }
          if (!avcSample) {
            avcSample = this.avcSample = createAVCSample(true, pes.pts, pes.dts, '');
          }
          avcSample.key = true;
          avcSample.frame = true;
          break;
        // SEI
        case 6:
          {
            push = true;
            parseSEIMessageFromNALu(unit.data, 1, pes.pts, textTrack.samples);
            break;
            // SPS
          }

        case 7:
          push = true;
          spsfound = true;
          if (!track.sps) {
            const sps = unit.data;
            const expGolombDecoder = new ExpGolomb(sps);
            const config = expGolombDecoder.readSPS();
            track.width = config.width;
            track.height = config.height;
            track.pixelRatio = config.pixelRatio;
            track.sps = [sps];
            track.duration = this._duration;
            const codecarray = sps.subarray(1, 4);
            let codecstring = 'avc1.';
            for (let i = 0; i < 3; i++) {
              let h = codecarray[i].toString(16);
              if (h.length < 2) {
                h = '0' + h;
              }
              codecstring += h;
            }
            track.codec = codecstring;
          }
          break;
        // PPS
        case 8:
          push = true;
          if (!track.pps) {
            track.pps = [unit.data];
          }
          break;
        // AUD
        case 9:
          push = false;
          track.audFound = true;
          if (avcSample) {
            pushAccessUnit(avcSample, track);
          }
          avcSample = this.avcSample = createAVCSample(false, pes.pts, pes.dts, '');
          break;
        // Filler Data
        case 12:
          push = true;
          break;
        default:
          push = false;
          if (avcSample) {
            avcSample.debug += 'unknown NAL ' + unit.type + ' ';
          }
          break;
      }
      if (avcSample && push) {
        const units = avcSample.units;
        units.push(unit);
      }
    });
    // if last PES packet, push samples
    if (last && avcSample) {
      pushAccessUnit(avcSample, track);
      this.avcSample = null;
    }
  }
  getLastNalUnit(samples) {
    var _avcSample3;
    let avcSample = this.avcSample;
    let lastUnit;
    // try to fallback to previous sample if current one is empty
    if (!avcSample || avcSample.units.length === 0) {
      avcSample = samples[samples.length - 1];
    }
    if ((_avcSample3 = avcSample) != null && _avcSample3.units) {
      const units = avcSample.units;
      lastUnit = units[units.length - 1];
    }
    return lastUnit;
  }
  parseAVCNALu(track, array) {
    const len = array.byteLength;
    let state = track.naluState || 0;
    const lastState = state;
    const units = [];
    let i = 0;
    let value;
    let overflow;
    let unitType;
    let lastUnitStart = -1;
    let lastUnitType = 0;
    // logger.log('PES:' + Hex.hexDump(array));

    if (state === -1) {
      // special use case where we found 3 or 4-byte start codes exactly at the end of previous PES packet
      lastUnitStart = 0;
      // NALu type is value read from offset 0
      lastUnitType = array[0] & 0x1f;
      state = 0;
      i = 1;
    }
    while (i < len) {
      value = array[i++];
      // optimization. state 0 and 1 are the predominant case. let's handle them outside of the switch/case
      if (!state) {
        state = value ? 0 : 1;
        continue;
      }
      if (state === 1) {
        state = value ? 0 : 2;
        continue;
      }
      // here we have state either equal to 2 or 3
      if (!value) {
        state = 3;
      } else if (value === 1) {
        if (lastUnitStart >= 0) {
          const unit = {
            data: array.subarray(lastUnitStart, i - state - 1),
            type: lastUnitType
          };
          // logger.log('pushing NALU, type/size:' + unit.type + '/' + unit.data.byteLength);
          units.push(unit);
        } else {
          // lastUnitStart is undefined => this is the first start code found in this PES packet
          // first check if start code delimiter is overlapping between 2 PES packets,
          // ie it started in last packet (lastState not zero)
          // and ended at the beginning of this PES packet (i <= 4 - lastState)
          const lastUnit = this.getLastNalUnit(track.samples);
          if (lastUnit) {
            if (lastState && i <= 4 - lastState) {
              // start delimiter overlapping between PES packets
              // strip start delimiter bytes from the end of last NAL unit
              // check if lastUnit had a state different from zero
              if (lastUnit.state) {
                // strip last bytes
                lastUnit.data = lastUnit.data.subarray(0, lastUnit.data.byteLength - lastState);
              }
            }
            // If NAL units are not starting right at the beginning of the PES packet, push preceding data into previous NAL unit.
            overflow = i - state - 1;
            if (overflow > 0) {
              // logger.log('first NALU found with overflow:' + overflow);
              const tmp = new Uint8Array(lastUnit.data.byteLength + overflow);
              tmp.set(lastUnit.data, 0);
              tmp.set(array.subarray(0, overflow), lastUnit.data.byteLength);
              lastUnit.data = tmp;
              lastUnit.state = 0;
            }
          }
        }
        // check if we can read unit type
        if (i < len) {
          unitType = array[i] & 0x1f;
          // logger.log('find NALU @ offset:' + i + ',type:' + unitType);
          lastUnitStart = i;
          lastUnitType = unitType;
          state = 0;
        } else {
          // not enough byte to read unit type. let's read it on next PES parsing
          state = -1;
        }
      } else {
        state = 0;
      }
    }
    if (lastUnitStart >= 0 && state >= 0) {
      const unit = {
        data: array.subarray(lastUnitStart, len),
        type: lastUnitType,
        state: state
      };
      units.push(unit);
      // logger.log('pushing NALU, type/size/state:' + unit.type + '/' + unit.data.byteLength + '/' + state);
    }
    // no NALu found
    if (units.length === 0) {
      // append pes.data to previous NAL unit
      const lastUnit = this.getLastNalUnit(track.samples);
      if (lastUnit) {
        const tmp = new Uint8Array(lastUnit.data.byteLength + array.byteLength);
        tmp.set(lastUnit.data, 0);
        tmp.set(array, lastUnit.data.byteLength);
        lastUnit.data = tmp;
      }
    }
    track.naluState = state;
    return units;
  }
  parseAACPES(track, pes) {
    let startOffset = 0;
    const aacOverFlow = this.aacOverFlow;
    let data = pes.data;
    if (aacOverFlow) {
      this.aacOverFlow = null;
      const frameMissingBytes = aacOverFlow.missing;
      const sampleLength = aacOverFlow.sample.unit.byteLength;
      // logger.log(`AAC: append overflowing ${sampleLength} bytes to beginning of new PES`);
      if (frameMissingBytes === -1) {
        const tmp = new Uint8Array(sampleLength + data.byteLength);
        tmp.set(aacOverFlow.sample.unit, 0);
        tmp.set(data, sampleLength);
        data = tmp;
      } else {
        const frameOverflowBytes = sampleLength - frameMissingBytes;
        aacOverFlow.sample.unit.set(data.subarray(0, frameMissingBytes), frameOverflowBytes);
        track.samples.push(aacOverFlow.sample);
        startOffset = aacOverFlow.missing;
      }
    }
    // look for ADTS header (0xFFFx)
    let offset;
    let len;
    for (offset = startOffset, len = data.length; offset < len - 1; offset++) {
      if (isHeader$1(data, offset)) {
        break;
      }
    }
    // if ADTS header does not start straight from the beginning of the PES payload, raise an error
    if (offset !== startOffset) {
      let reason;
      const recoverable = offset < len - 1;
      if (recoverable) {
        reason = `AAC PES did not start with ADTS header,offset:${offset}`;
      } else {
        reason = 'No ADTS header found in AAC PES';
      }
      const error = new Error(reason);
      logger.warn(`parsing error: ${reason}`);
      this.observer.emit(Events.ERROR, Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.FRAG_PARSING_ERROR,
        fatal: false,
        levelRetry: recoverable,
        error,
        reason
      });
      if (!recoverable) {
        return;
      }
    }
    initTrackConfig(track, this.observer, data, offset, this.audioCodec);
    let pts;
    if (pes.pts !== undefined) {
      pts = pes.pts;
    } else if (aacOverFlow) {
      // if last AAC frame is overflowing, we should ensure timestamps are contiguous:
      // first sample PTS should be equal to last sample PTS + frameDuration
      const frameDuration = getFrameDuration(track.samplerate);
      pts = aacOverFlow.sample.pts + frameDuration;
    } else {
      logger.warn('[tsdemuxer]: AAC PES unknown PTS');
      return;
    }

    // scan for aac samples
    let frameIndex = 0;
    let frame;
    while (offset < len) {
      frame = appendFrame$1(track, data, offset, pts, frameIndex);
      offset += frame.length;
      if (!frame.missing) {
        frameIndex++;
        for (; offset < len - 1; offset++) {
          if (isHeader$1(data, offset)) {
            break;
          }
        }
      } else {
        this.aacOverFlow = frame;
        break;
      }
    }
  }
  parseMPEGPES(track, pes) {
    const data = pes.data;
    const length = data.length;
    let frameIndex = 0;
    let offset = 0;
    const pts = pes.pts;
    if (pts === undefined) {
      logger.warn('[tsdemuxer]: MPEG PES unknown PTS');
      return;
    }
    while (offset < length) {
      if (isHeader(data, offset)) {
        const frame = appendFrame(track, data, offset, pts, frameIndex);
        if (frame) {
          offset += frame.length;
          frameIndex++;
        } else {
          // logger.log('Unable to parse Mpeg audio frame');
          break;
        }
      } else {
        // nothing found, keep looking
        offset++;
      }
    }
  }
  parseID3PES(id3Track, pes) {
    if (pes.pts === undefined) {
      logger.warn('[tsdemuxer]: ID3 PES unknown PTS');
      return;
    }
    const id3Sample = _extends({}, pes, {
      type: this._avcTrack ? MetadataSchema.emsg : MetadataSchema.audioId3,
      duration: Number.POSITIVE_INFINITY
    });
    id3Track.samples.push(id3Sample);
  }
}
function createAVCSample(key, pts, dts, debug) {
  return {
    key,
    frame: false,
    pts,
    dts,
    units: [],
    debug,
    length: 0
  };
}
function parsePID(data, offset) {
  // pid is a 13-bit field starting at the last bit of TS[1]
  return ((data[offset + 1] & 0x1f) << 8) + data[offset + 2];
}
function parsePAT(data, offset) {
  // skip the PSI header and parse the first PMT entry
  return (data[offset + 10] & 0x1f) << 8 | data[offset + 11];
}
function parsePMT(data, offset, typeSupported, isSampleAes) {
  const result = {
    audio: -1,
    avc: -1,
    id3: -1,
    segmentCodec: 'aac'
  };
  const sectionLength = (data[offset + 1] & 0x0f) << 8 | data[offset + 2];
  const tableEnd = offset + 3 + sectionLength - 4;
  // to determine where the table is, we have to figure out how
  // long the program info descriptors are
  const programInfoLength = (data[offset + 10] & 0x0f) << 8 | data[offset + 11];
  // advance the offset to the first entry in the mapping table
  offset += 12 + programInfoLength;
  while (offset < tableEnd) {
    const pid = parsePID(data, offset);
    switch (data[offset]) {
      case 0xcf:
        // SAMPLE-AES AAC
        if (!isSampleAes) {
          logger.log('ADTS AAC with AES-128-CBC frame encryption found in unencrypted stream');
          break;
        }
      /* falls through */
      case 0x0f:
        // ISO/IEC 13818-7 ADTS AAC (MPEG-2 lower bit-rate audio)
        // logger.log('AAC PID:'  + pid);
        if (result.audio === -1) {
          result.audio = pid;
        }
        break;

      // Packetized metadata (ID3)
      case 0x15:
        // logger.log('ID3 PID:'  + pid);
        if (result.id3 === -1) {
          result.id3 = pid;
        }
        break;
      case 0xdb:
        // SAMPLE-AES AVC
        if (!isSampleAes) {
          logger.log('H.264 with AES-128-CBC slice encryption found in unencrypted stream');
          break;
        }
      /* falls through */
      case 0x1b:
        // ITU-T Rec. H.264 and ISO/IEC 14496-10 (lower bit-rate video)
        // logger.log('AVC PID:'  + pid);
        if (result.avc === -1) {
          result.avc = pid;
        }
        break;

      // ISO/IEC 11172-3 (MPEG-1 audio)
      // or ISO/IEC 13818-3 (MPEG-2 halved sample rate audio)
      case 0x03:
      case 0x04:
        // logger.log('MPEG PID:'  + pid);
        if (typeSupported.mpeg !== true && typeSupported.mp3 !== true) {
          logger.log('MPEG audio found, not supported in this browser');
        } else if (result.audio === -1) {
          result.audio = pid;
          result.segmentCodec = 'mp3';
        }
        break;
      case 0x24:
        logger.warn('Unsupported HEVC stream type found');
        break;
    }
    // move to the next table entry
    // skip past the elementary stream descriptors, if present
    offset += ((data[offset + 3] & 0x0f) << 8 | data[offset + 4]) + 5;
  }
  return result;
}
function parsePES(stream) {
  let i = 0;
  let frag;
  let pesLen;
  let pesHdrLen;
  let pesPts;
  let pesDts;
  const data = stream.data;
  // safety check
  if (!stream || stream.size === 0) {
    return null;
  }

  // we might need up to 19 bytes to read PES header
  // if first chunk of data is less than 19 bytes, let's merge it with following ones until we get 19 bytes
  // usually only one merge is needed (and this is rare ...)
  while (data[0].length < 19 && data.length > 1) {
    const newData = new Uint8Array(data[0].length + data[1].length);
    newData.set(data[0]);
    newData.set(data[1], data[0].length);
    data[0] = newData;
    data.splice(1, 1);
  }
  // retrieve PTS/DTS from first fragment
  frag = data[0];
  const pesPrefix = (frag[0] << 16) + (frag[1] << 8) + frag[2];
  if (pesPrefix === 1) {
    pesLen = (frag[4] << 8) + frag[5];
    // if PES parsed length is not zero and greater than total received length, stop parsing. PES might be truncated
    // minus 6 : PES header size
    if (pesLen && pesLen > stream.size - 6) {
      return null;
    }
    const pesFlags = frag[7];
    if (pesFlags & 0xc0) {
      /* PES header described here : http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
          as PTS / DTS is 33 bit we cannot use bitwise operator in JS,
          as Bitwise operators treat their operands as a sequence of 32 bits */
      pesPts = (frag[9] & 0x0e) * 536870912 +
      // 1 << 29
      (frag[10] & 0xff) * 4194304 +
      // 1 << 22
      (frag[11] & 0xfe) * 16384 +
      // 1 << 14
      (frag[12] & 0xff) * 128 +
      // 1 << 7
      (frag[13] & 0xfe) / 2;
      if (pesFlags & 0x40) {
        pesDts = (frag[14] & 0x0e) * 536870912 +
        // 1 << 29
        (frag[15] & 0xff) * 4194304 +
        // 1 << 22
        (frag[16] & 0xfe) * 16384 +
        // 1 << 14
        (frag[17] & 0xff) * 128 +
        // 1 << 7
        (frag[18] & 0xfe) / 2;
        if (pesPts - pesDts > 60 * 90000) {
          logger.warn(`${Math.round((pesPts - pesDts) / 90000)}s delta between PTS and DTS, align them`);
          pesPts = pesDts;
        }
      } else {
        pesDts = pesPts;
      }
    }
    pesHdrLen = frag[8];
    // 9 bytes : 6 bytes for PES header + 3 bytes for PES extension
    let payloadStartOffset = pesHdrLen + 9;
    if (stream.size <= payloadStartOffset) {
      return null;
    }
    stream.size -= payloadStartOffset;
    // reassemble PES packet
    const pesData = new Uint8Array(stream.size);
    for (let j = 0, dataLen = data.length; j < dataLen; j++) {
      frag = data[j];
      let len = frag.byteLength;
      if (payloadStartOffset) {
        if (payloadStartOffset > len) {
          // trim full frag if PES header bigger than frag
          payloadStartOffset -= len;
          continue;
        } else {
          // trim partial frag if PES header smaller than frag
          frag = frag.subarray(payloadStartOffset);
          len -= payloadStartOffset;
          payloadStartOffset = 0;
        }
      }
      pesData.set(frag, i);
      i += len;
    }
    if (pesLen) {
      // payload size : remove PES header + PES extension
      pesLen -= pesHdrLen + 3;
    }
    return {
      data: pesData,
      pts: pesPts,
      dts: pesDts,
      len: pesLen
    };
  }
  return null;
}
function pushAccessUnit(avcSample, avcTrack) {
  if (avcSample.units.length && avcSample.frame) {
    // if sample does not have PTS/DTS, patch with last sample PTS/DTS
    if (avcSample.pts === undefined) {
      const samples = avcTrack.samples;
      const nbSamples = samples.length;
      if (nbSamples) {
        const lastSample = samples[nbSamples - 1];
        avcSample.pts = lastSample.pts;
        avcSample.dts = lastSample.dts;
      } else {
        // dropping samples, no timestamp found
        avcTrack.dropped++;
        return;
      }
    }
    avcTrack.samples.push(avcSample);
  }
  if (avcSample.debug.length) {
    logger.log(avcSample.pts + '/' + avcSample.dts + ':' + avcSample.debug);
  }
}

/**
 * MP3 demuxer
 */
class MP3Demuxer extends BaseAudioDemuxer {
  resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
    super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
    this._audioTrack = {
      container: 'audio/mpeg',
      type: 'audio',
      id: 2,
      pid: -1,
      sequenceNumber: 0,
      segmentCodec: 'mp3',
      samples: [],
      manifestCodec: audioCodec,
      duration: trackDuration,
      inputTimeScale: 90000,
      dropped: 0
    };
  }
  static probe(data) {
    if (!data) {
      return false;
    }

    // check if data contains ID3 timestamp and MPEG sync word
    // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
    // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
    // More info http://www.mp3-tech.org/programmer/frame_header.html
    const id3Data = getID3Data(data, 0) || [];
    let offset = id3Data.length;
    for (let length = data.length; offset < length; offset++) {
      if (probe(data, offset)) {
        logger.log('MPEG Audio sync word found !');
        return true;
      }
    }
    return false;
  }
  canParse(data, offset) {
    return canParse(data, offset);
  }
  appendFrame(track, data, offset) {
    if (this.basePTS === null) {
      return;
    }
    return appendFrame(track, data, offset, this.basePTS, this.frameIndex);
  }
}

/**
 *  AAC helper
 */

class AAC {
  static getSilentFrame(codec, channelCount) {
    switch (codec) {
      case 'mp4a.40.2':
        if (channelCount === 1) {
          return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x23, 0x80]);
        } else if (channelCount === 2) {
          return new Uint8Array([0x21, 0x00, 0x49, 0x90, 0x02, 0x19, 0x00, 0x23, 0x80]);
        } else if (channelCount === 3) {
          return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x8e]);
        } else if (channelCount === 4) {
          return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x80, 0x2c, 0x80, 0x08, 0x02, 0x38]);
        } else if (channelCount === 5) {
          return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x38]);
        } else if (channelCount === 6) {
          return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x00, 0xb2, 0x00, 0x20, 0x08, 0xe0]);
        }
        break;
      // handle HE-AAC below (mp4a.40.5 / mp4a.40.29)
      default:
        if (channelCount === 1) {
          // ffmpeg -y -f lavfi -i "aevalsrc=0:d=0.05" -c:a libfdk_aac -profile:a aac_he -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
          return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x4e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x1c, 0x6, 0xf1, 0xc1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
        } else if (channelCount === 2) {
          // ffmpeg -y -f lavfi -i "aevalsrc=0|0:d=0.05" -c:a libfdk_aac -profile:a aac_he_v2 -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
          return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
        } else if (channelCount === 3) {
          // ffmpeg -y -f lavfi -i "aevalsrc=0|0|0:d=0.05" -c:a libfdk_aac -profile:a aac_he_v2 -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
          return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
        }
        break;
    }
    return undefined;
  }
}

/**
 * Generate MP4 Box
 */

const UINT32_MAX = Math.pow(2, 32) - 1;
class MP4 {
  static init() {
    MP4.types = {
      avc1: [],
      // codingname
      avcC: [],
      btrt: [],
      dinf: [],
      dref: [],
      esds: [],
      ftyp: [],
      hdlr: [],
      mdat: [],
      mdhd: [],
      mdia: [],
      mfhd: [],
      minf: [],
      moof: [],
      moov: [],
      mp4a: [],
      '.mp3': [],
      mvex: [],
      mvhd: [],
      pasp: [],
      sdtp: [],
      stbl: [],
      stco: [],
      stsc: [],
      stsd: [],
      stsz: [],
      stts: [],
      tfdt: [],
      tfhd: [],
      traf: [],
      trak: [],
      trun: [],
      trex: [],
      tkhd: [],
      vmhd: [],
      smhd: []
    };
    let i;
    for (i in MP4.types) {
      if (MP4.types.hasOwnProperty(i)) {
        MP4.types[i] = [i.charCodeAt(0), i.charCodeAt(1), i.charCodeAt(2), i.charCodeAt(3)];
      }
    }
    const videoHdlr = new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00,
    // pre_defined
    0x76, 0x69, 0x64, 0x65,
    // handler_type: 'vide'
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x56, 0x69, 0x64, 0x65, 0x6f, 0x48, 0x61, 0x6e, 0x64, 0x6c, 0x65, 0x72, 0x00 // name: 'VideoHandler'
    ]);

    const audioHdlr = new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00,
    // pre_defined
    0x73, 0x6f, 0x75, 0x6e,
    // handler_type: 'soun'
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x53, 0x6f, 0x75, 0x6e, 0x64, 0x48, 0x61, 0x6e, 0x64, 0x6c, 0x65, 0x72, 0x00 // name: 'SoundHandler'
    ]);

    MP4.HDLR_TYPES = {
      video: videoHdlr,
      audio: audioHdlr
    };
    const dref = new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x01,
    // entry_count
    0x00, 0x00, 0x00, 0x0c,
    // entry_size
    0x75, 0x72, 0x6c, 0x20,
    // 'url' type
    0x00,
    // version 0
    0x00, 0x00, 0x01 // entry_flags
    ]);

    const stco = new Uint8Array([0x00,
    // version
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00 // entry_count
    ]);

    MP4.STTS = MP4.STSC = MP4.STCO = stco;
    MP4.STSZ = new Uint8Array([0x00,
    // version
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00,
    // sample_size
    0x00, 0x00, 0x00, 0x00 // sample_count
    ]);

    MP4.VMHD = new Uint8Array([0x00,
    // version
    0x00, 0x00, 0x01,
    // flags
    0x00, 0x00,
    // graphicsmode
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // opcolor
    ]);

    MP4.SMHD = new Uint8Array([0x00,
    // version
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00,
    // balance
    0x00, 0x00 // reserved
    ]);

    MP4.STSD = new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x01]); // entry_count

    const majorBrand = new Uint8Array([105, 115, 111, 109]); // isom
    const avc1Brand = new Uint8Array([97, 118, 99, 49]); // avc1
    const minorVersion = new Uint8Array([0, 0, 0, 1]);
    MP4.FTYP = MP4.box(MP4.types.ftyp, majorBrand, minorVersion, majorBrand, avc1Brand);
    MP4.DINF = MP4.box(MP4.types.dinf, MP4.box(MP4.types.dref, dref));
  }
  static box(type, ...payload) {
    let size = 8;
    let i = payload.length;
    const len = i;
    // calculate the total size we need to allocate
    while (i--) {
      size += payload[i].byteLength;
    }
    const result = new Uint8Array(size);
    result[0] = size >> 24 & 0xff;
    result[1] = size >> 16 & 0xff;
    result[2] = size >> 8 & 0xff;
    result[3] = size & 0xff;
    result.set(type, 4);
    // copy the payload into the result
    for (i = 0, size = 8; i < len; i++) {
      // copy payload[i] array @ offset size
      result.set(payload[i], size);
      size += payload[i].byteLength;
    }
    return result;
  }
  static hdlr(type) {
    return MP4.box(MP4.types.hdlr, MP4.HDLR_TYPES[type]);
  }
  static mdat(data) {
    return MP4.box(MP4.types.mdat, data);
  }
  static mdhd(timescale, duration) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(MP4.types.mdhd, new Uint8Array([0x01,
    // version 1
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
    // creation_time
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
    // modification_time
    timescale >> 24 & 0xff, timescale >> 16 & 0xff, timescale >> 8 & 0xff, timescale & 0xff,
    // timescale
    upperWordDuration >> 24, upperWordDuration >> 16 & 0xff, upperWordDuration >> 8 & 0xff, upperWordDuration & 0xff, lowerWordDuration >> 24, lowerWordDuration >> 16 & 0xff, lowerWordDuration >> 8 & 0xff, lowerWordDuration & 0xff, 0x55, 0xc4,
    // 'und' language (undetermined)
    0x00, 0x00]));
  }
  static mdia(track) {
    return MP4.box(MP4.types.mdia, MP4.mdhd(track.timescale, track.duration), MP4.hdlr(track.type), MP4.minf(track));
  }
  static mfhd(sequenceNumber) {
    return MP4.box(MP4.types.mfhd, new Uint8Array([0x00, 0x00, 0x00, 0x00,
    // flags
    sequenceNumber >> 24, sequenceNumber >> 16 & 0xff, sequenceNumber >> 8 & 0xff, sequenceNumber & 0xff // sequence_number
    ]));
  }

  static minf(track) {
    if (track.type === 'audio') {
      return MP4.box(MP4.types.minf, MP4.box(MP4.types.smhd, MP4.SMHD), MP4.DINF, MP4.stbl(track));
    } else {
      return MP4.box(MP4.types.minf, MP4.box(MP4.types.vmhd, MP4.VMHD), MP4.DINF, MP4.stbl(track));
    }
  }
  static moof(sn, baseMediaDecodeTime, track) {
    return MP4.box(MP4.types.moof, MP4.mfhd(sn), MP4.traf(track, baseMediaDecodeTime));
  }
  static moov(tracks) {
    let i = tracks.length;
    const boxes = [];
    while (i--) {
      boxes[i] = MP4.trak(tracks[i]);
    }
    return MP4.box.apply(null, [MP4.types.moov, MP4.mvhd(tracks[0].timescale, tracks[0].duration)].concat(boxes).concat(MP4.mvex(tracks)));
  }
  static mvex(tracks) {
    let i = tracks.length;
    const boxes = [];
    while (i--) {
      boxes[i] = MP4.trex(tracks[i]);
    }
    return MP4.box.apply(null, [MP4.types.mvex, ...boxes]);
  }
  static mvhd(timescale, duration) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    const bytes = new Uint8Array([0x01,
    // version 1
    0x00, 0x00, 0x00,
    // flags
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
    // creation_time
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
    // modification_time
    timescale >> 24 & 0xff, timescale >> 16 & 0xff, timescale >> 8 & 0xff, timescale & 0xff,
    // timescale
    upperWordDuration >> 24, upperWordDuration >> 16 & 0xff, upperWordDuration >> 8 & 0xff, upperWordDuration & 0xff, lowerWordDuration >> 24, lowerWordDuration >> 16 & 0xff, lowerWordDuration >> 8 & 0xff, lowerWordDuration & 0xff, 0x00, 0x01, 0x00, 0x00,
    // 1.0 rate
    0x01, 0x00,
    // 1.0 volume
    0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
    // transformation: unity matrix
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // pre_defined
    0xff, 0xff, 0xff, 0xff // next_track_ID
    ]);

    return MP4.box(MP4.types.mvhd, bytes);
  }
  static sdtp(track) {
    const samples = track.samples || [];
    const bytes = new Uint8Array(4 + samples.length);
    let i;
    let flags;
    // leave the full box header (4 bytes) all zero
    // write the sample table
    for (i = 0; i < samples.length; i++) {
      flags = samples[i].flags;
      bytes[i + 4] = flags.dependsOn << 4 | flags.isDependedOn << 2 | flags.hasRedundancy;
    }
    return MP4.box(MP4.types.sdtp, bytes);
  }
  static stbl(track) {
    return MP4.box(MP4.types.stbl, MP4.stsd(track), MP4.box(MP4.types.stts, MP4.STTS), MP4.box(MP4.types.stsc, MP4.STSC), MP4.box(MP4.types.stsz, MP4.STSZ), MP4.box(MP4.types.stco, MP4.STCO));
  }
  static avc1(track) {
    let sps = [];
    let pps = [];
    let i;
    let data;
    let len;
    // assemble the SPSs

    for (i = 0; i < track.sps.length; i++) {
      data = track.sps[i];
      len = data.byteLength;
      sps.push(len >>> 8 & 0xff);
      sps.push(len & 0xff);

      // SPS
      sps = sps.concat(Array.prototype.slice.call(data));
    }

    // assemble the PPSs
    for (i = 0; i < track.pps.length; i++) {
      data = track.pps[i];
      len = data.byteLength;
      pps.push(len >>> 8 & 0xff);
      pps.push(len & 0xff);
      pps = pps.concat(Array.prototype.slice.call(data));
    }
    const avcc = MP4.box(MP4.types.avcC, new Uint8Array([0x01,
    // version
    sps[3],
    // profile
    sps[4],
    // profile compat
    sps[5],
    // level
    0xfc | 3,
    // lengthSizeMinusOne, hard-coded to 4 bytes
    0xe0 | track.sps.length // 3bit reserved (111) + numOfSequenceParameterSets
    ].concat(sps).concat([track.pps.length // numOfPictureParameterSets
    ]).concat(pps))); // "PPS"
    const width = track.width;
    const height = track.height;
    const hSpacing = track.pixelRatio[0];
    const vSpacing = track.pixelRatio[1];
    return MP4.box(MP4.types.avc1, new Uint8Array([0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00,
    // reserved
    0x00, 0x01,
    // data_reference_index
    0x00, 0x00,
    // pre_defined
    0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // pre_defined
    width >> 8 & 0xff, width & 0xff,
    // width
    height >> 8 & 0xff, height & 0xff,
    // height
    0x00, 0x48, 0x00, 0x00,
    // horizresolution
    0x00, 0x48, 0x00, 0x00,
    // vertresolution
    0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x01,
    // frame_count
    0x12, 0x64, 0x61, 0x69, 0x6c,
    // dailymotion/hls.js
    0x79, 0x6d, 0x6f, 0x74, 0x69, 0x6f, 0x6e, 0x2f, 0x68, 0x6c, 0x73, 0x2e, 0x6a, 0x73, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // compressorname
    0x00, 0x18,
    // depth = 24
    0x11, 0x11]),
    // pre_defined = -1
    avcc, MP4.box(MP4.types.btrt, new Uint8Array([0x00, 0x1c, 0x9c, 0x80,
    // bufferSizeDB
    0x00, 0x2d, 0xc6, 0xc0,
    // maxBitrate
    0x00, 0x2d, 0xc6, 0xc0])),
    // avgBitrate
    MP4.box(MP4.types.pasp, new Uint8Array([hSpacing >> 24,
    // hSpacing
    hSpacing >> 16 & 0xff, hSpacing >> 8 & 0xff, hSpacing & 0xff, vSpacing >> 24,
    // vSpacing
    vSpacing >> 16 & 0xff, vSpacing >> 8 & 0xff, vSpacing & 0xff])));
  }
  static esds(track) {
    const configlen = track.config.length;
    return new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags

    0x03,
    // descriptor_type
    0x17 + configlen,
    // length
    0x00, 0x01,
    // es_id
    0x00,
    // stream_priority

    0x04,
    // descriptor_type
    0x0f + configlen,
    // length
    0x40,
    // codec : mpeg4_audio
    0x15,
    // stream_type
    0x00, 0x00, 0x00,
    // buffer_size
    0x00, 0x00, 0x00, 0x00,
    // maxBitrate
    0x00, 0x00, 0x00, 0x00,
    // avgBitrate

    0x05 // descriptor_type
    ].concat([configlen]).concat(track.config).concat([0x06, 0x01, 0x02])); // GASpecificConfig)); // length + audio config descriptor
  }

  static mp4a(track) {
    const samplerate = track.samplerate;
    return MP4.box(MP4.types.mp4a, new Uint8Array([0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00,
    // reserved
    0x00, 0x01,
    // data_reference_index
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, track.channelCount,
    // channelcount
    0x00, 0x10,
    // sampleSize:16bits
    0x00, 0x00, 0x00, 0x00,
    // reserved2
    samplerate >> 8 & 0xff, samplerate & 0xff,
    //
    0x00, 0x00]), MP4.box(MP4.types.esds, MP4.esds(track)));
  }
  static mp3(track) {
    const samplerate = track.samplerate;
    return MP4.box(MP4.types['.mp3'], new Uint8Array([0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00, 0x00,
    // reserved
    0x00, 0x01,
    // data_reference_index
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, track.channelCount,
    // channelcount
    0x00, 0x10,
    // sampleSize:16bits
    0x00, 0x00, 0x00, 0x00,
    // reserved2
    samplerate >> 8 & 0xff, samplerate & 0xff,
    //
    0x00, 0x00]));
  }
  static stsd(track) {
    if (track.type === 'audio') {
      if (track.segmentCodec === 'mp3' && track.codec === 'mp3') {
        return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp3(track));
      }
      return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp4a(track));
    } else {
      return MP4.box(MP4.types.stsd, MP4.STSD, MP4.avc1(track));
    }
  }
  static tkhd(track) {
    const id = track.id;
    const duration = track.duration * track.timescale;
    const width = track.width;
    const height = track.height;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(MP4.types.tkhd, new Uint8Array([0x01,
    // version 1
    0x00, 0x00, 0x07,
    // flags
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
    // creation_time
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
    // modification_time
    id >> 24 & 0xff, id >> 16 & 0xff, id >> 8 & 0xff, id & 0xff,
    // track_ID
    0x00, 0x00, 0x00, 0x00,
    // reserved
    upperWordDuration >> 24, upperWordDuration >> 16 & 0xff, upperWordDuration >> 8 & 0xff, upperWordDuration & 0xff, lowerWordDuration >> 24, lowerWordDuration >> 16 & 0xff, lowerWordDuration >> 8 & 0xff, lowerWordDuration & 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // reserved
    0x00, 0x00,
    // layer
    0x00, 0x00,
    // alternate_group
    0x00, 0x00,
    // non-audio track volume
    0x00, 0x00,
    // reserved
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
    // transformation: unity matrix
    width >> 8 & 0xff, width & 0xff, 0x00, 0x00,
    // width
    height >> 8 & 0xff, height & 0xff, 0x00, 0x00 // height
    ]));
  }

  static traf(track, baseMediaDecodeTime) {
    const sampleDependencyTable = MP4.sdtp(track);
    const id = track.id;
    const upperWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime / (UINT32_MAX + 1));
    const lowerWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime % (UINT32_MAX + 1));
    return MP4.box(MP4.types.traf, MP4.box(MP4.types.tfhd, new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    id >> 24, id >> 16 & 0xff, id >> 8 & 0xff, id & 0xff // track_ID
    ])), MP4.box(MP4.types.tfdt, new Uint8Array([0x01,
    // version 1
    0x00, 0x00, 0x00,
    // flags
    upperWordBaseMediaDecodeTime >> 24, upperWordBaseMediaDecodeTime >> 16 & 0xff, upperWordBaseMediaDecodeTime >> 8 & 0xff, upperWordBaseMediaDecodeTime & 0xff, lowerWordBaseMediaDecodeTime >> 24, lowerWordBaseMediaDecodeTime >> 16 & 0xff, lowerWordBaseMediaDecodeTime >> 8 & 0xff, lowerWordBaseMediaDecodeTime & 0xff])), MP4.trun(track, sampleDependencyTable.length + 16 +
    // tfhd
    20 +
    // tfdt
    8 +
    // traf header
    16 +
    // mfhd
    8 +
    // moof header
    8),
    // mdat header
    sampleDependencyTable);
  }

  /**
   * Generate a track box.
   * @param track a track definition
   */
  static trak(track) {
    track.duration = track.duration || 0xffffffff;
    return MP4.box(MP4.types.trak, MP4.tkhd(track), MP4.mdia(track));
  }
  static trex(track) {
    const id = track.id;
    return MP4.box(MP4.types.trex, new Uint8Array([0x00,
    // version 0
    0x00, 0x00, 0x00,
    // flags
    id >> 24, id >> 16 & 0xff, id >> 8 & 0xff, id & 0xff,
    // track_ID
    0x00, 0x00, 0x00, 0x01,
    // default_sample_description_index
    0x00, 0x00, 0x00, 0x00,
    // default_sample_duration
    0x00, 0x00, 0x00, 0x00,
    // default_sample_size
    0x00, 0x01, 0x00, 0x01 // default_sample_flags
    ]));
  }

  static trun(track, offset) {
    const samples = track.samples || [];
    const len = samples.length;
    const arraylen = 12 + 16 * len;
    const array = new Uint8Array(arraylen);
    let i;
    let sample;
    let duration;
    let size;
    let flags;
    let cts;
    offset += 8 + arraylen;
    array.set([track.type === 'video' ? 0x01 : 0x00,
    // version 1 for video with signed-int sample_composition_time_offset
    0x00, 0x0f, 0x01,
    // flags
    len >>> 24 & 0xff, len >>> 16 & 0xff, len >>> 8 & 0xff, len & 0xff,
    // sample_count
    offset >>> 24 & 0xff, offset >>> 16 & 0xff, offset >>> 8 & 0xff, offset & 0xff // data_offset
    ], 0);
    for (i = 0; i < len; i++) {
      sample = samples[i];
      duration = sample.duration;
      size = sample.size;
      flags = sample.flags;
      cts = sample.cts;
      array.set([duration >>> 24 & 0xff, duration >>> 16 & 0xff, duration >>> 8 & 0xff, duration & 0xff,
      // sample_duration
      size >>> 24 & 0xff, size >>> 16 & 0xff, size >>> 8 & 0xff, size & 0xff,
      // sample_size
      flags.isLeading << 2 | flags.dependsOn, flags.isDependedOn << 6 | flags.hasRedundancy << 4 | flags.paddingValue << 1 | flags.isNonSync, flags.degradPrio & 0xf0 << 8, flags.degradPrio & 0x0f,
      // sample_flags
      cts >>> 24 & 0xff, cts >>> 16 & 0xff, cts >>> 8 & 0xff, cts & 0xff // sample_composition_time_offset
      ], 12 + 16 * i);
    }
    return MP4.box(MP4.types.trun, array);
  }
  static initSegment(tracks) {
    if (!MP4.types) {
      MP4.init();
    }
    const movie = MP4.moov(tracks);
    const result = new Uint8Array(MP4.FTYP.byteLength + movie.byteLength);
    result.set(MP4.FTYP);
    result.set(movie, MP4.FTYP.byteLength);
    return result;
  }
}
MP4.types = void 0;
MP4.HDLR_TYPES = void 0;
MP4.STTS = void 0;
MP4.STSC = void 0;
MP4.STCO = void 0;
MP4.STSZ = void 0;
MP4.VMHD = void 0;
MP4.SMHD = void 0;
MP4.STSD = void 0;
MP4.FTYP = void 0;
MP4.DINF = void 0;

const MPEG_TS_CLOCK_FREQ_HZ = 90000;
function toTimescaleFromBase(baseTime, destScale, srcBase = 1, round = false) {
  const result = baseTime * destScale * srcBase; // equivalent to `(value * scale) / (1 / base)`
  return round ? Math.round(result) : result;
}
function toTimescaleFromScale(baseTime, destScale, srcScale = 1, round = false) {
  return toTimescaleFromBase(baseTime, destScale, 1 / srcScale, round);
}
function toMsFromMpegTsClock(baseTime, round = false) {
  return toTimescaleFromBase(baseTime, 1000, 1 / MPEG_TS_CLOCK_FREQ_HZ, round);
}
function toMpegTsClockFromTimescale(baseTime, srcScale = 1) {
  return toTimescaleFromBase(baseTime, MPEG_TS_CLOCK_FREQ_HZ, 1 / srcScale);
}

const MAX_SILENT_FRAME_DURATION = 10 * 1000; // 10 seconds
const AAC_SAMPLES_PER_FRAME = 1024;
const MPEG_AUDIO_SAMPLE_PER_FRAME = 1152;
let chromeVersion = null;
let safariWebkitVersion = null;
class MP4Remuxer {
  constructor(observer, config, typeSupported, vendor = '') {
    this.observer = void 0;
    this.config = void 0;
    this.typeSupported = void 0;
    this.ISGenerated = false;
    this._initPTS = null;
    this._initDTS = null;
    this.nextAvcDts = null;
    this.nextAudioPts = null;
    this.videoSampleDuration = null;
    this.isAudioContiguous = false;
    this.isVideoContiguous = false;
    this.observer = observer;
    this.config = config;
    this.typeSupported = typeSupported;
    this.ISGenerated = false;
    if (chromeVersion === null) {
      const userAgent = navigator.userAgent || '';
      const result = userAgent.match(/Chrome\/(\d+)/i);
      chromeVersion = result ? parseInt(result[1]) : 0;
    }
    if (safariWebkitVersion === null) {
      const result = navigator.userAgent.match(/Safari\/(\d+)/i);
      safariWebkitVersion = result ? parseInt(result[1]) : 0;
    }
  }
  destroy() {}
  resetTimeStamp(defaultTimeStamp) {
    logger.log('[mp4-remuxer]: initPTS & initDTS reset');
    this._initPTS = this._initDTS = defaultTimeStamp;
  }
  resetNextTimestamp() {
    logger.log('[mp4-remuxer]: reset next timestamp');
    this.isVideoContiguous = false;
    this.isAudioContiguous = false;
  }
  resetInitSegment() {
    logger.log('[mp4-remuxer]: ISGenerated flag reset');
    this.ISGenerated = false;
  }
  getVideoStartPts(videoSamples) {
    let rolloverDetected = false;
    const startPTS = videoSamples.reduce((minPTS, sample) => {
      const delta = sample.pts - minPTS;
      if (delta < -4294967296) {
        // 2^32, see PTSNormalize for reasoning, but we're hitting a rollover here, and we don't want that to impact the timeOffset calculation
        rolloverDetected = true;
        return normalizePts(minPTS, sample.pts);
      } else if (delta > 0) {
        return minPTS;
      } else {
        return sample.pts;
      }
    }, videoSamples[0].pts);
    if (rolloverDetected) {
      logger.debug('PTS rollover detected');
    }
    return startPTS;
  }
  remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, flush, playlistType) {
    let video;
    let audio;
    let initSegment;
    let text;
    let id3;
    let independent;
    let audioTimeOffset = timeOffset;
    let videoTimeOffset = timeOffset;

    // If we're remuxing audio and video progressively, wait until we've received enough samples for each track before proceeding.
    // This is done to synchronize the audio and video streams. We know if the current segment will have samples if the "pid"
    // parameter is greater than -1. The pid is set when the PMT is parsed, which contains the tracks list.
    // However, if the initSegment has already been generated, or we've reached the end of a segment (flush),
    // then we can remux one track without waiting for the other.
    const hasAudio = audioTrack.pid > -1;
    const hasVideo = videoTrack.pid > -1;
    const length = videoTrack.samples.length;
    const enoughAudioSamples = audioTrack.samples.length > 0;
    const enoughVideoSamples = flush && length > 0 || length > 1;
    const canRemuxAvc = (!hasAudio || enoughAudioSamples) && (!hasVideo || enoughVideoSamples) || this.ISGenerated || flush;
    if (canRemuxAvc) {
      if (!this.ISGenerated) {
        initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
      }
      const isVideoContiguous = this.isVideoContiguous;
      let firstKeyFrameIndex = -1;
      let firstKeyFramePTS;
      if (enoughVideoSamples) {
        firstKeyFrameIndex = findKeyframeIndex(videoTrack.samples);
        if (!isVideoContiguous && this.config.forceKeyFrameOnDiscontinuity) {
          independent = true;
          if (firstKeyFrameIndex > 0) {
            logger.warn(`[mp4-remuxer]: Dropped ${firstKeyFrameIndex} out of ${length} video samples due to a missing keyframe`);
            const startPTS = this.getVideoStartPts(videoTrack.samples);
            videoTrack.samples = videoTrack.samples.slice(firstKeyFrameIndex);
            videoTrack.dropped += firstKeyFrameIndex;
            videoTimeOffset += (videoTrack.samples[0].pts - startPTS) / videoTrack.inputTimeScale;
            firstKeyFramePTS = videoTimeOffset;
          } else if (firstKeyFrameIndex === -1) {
            logger.warn(`[mp4-remuxer]: No keyframe found out of ${length} video samples`);
            independent = false;
          }
        }
      }
      if (this.ISGenerated) {
        if (enoughAudioSamples && enoughVideoSamples) {
          // timeOffset is expected to be the offset of the first timestamp of this fragment (first DTS)
          // if first audio DTS is not aligned with first video DTS then we need to take that into account
          // when providing timeOffset to remuxAudio / remuxVideo. if we don't do that, there might be a permanent / small
          // drift between audio and video streams
          const startPTS = this.getVideoStartPts(videoTrack.samples);
          const tsDelta = normalizePts(audioTrack.samples[0].pts, startPTS) - startPTS;
          const audiovideoTimestampDelta = tsDelta / videoTrack.inputTimeScale;
          audioTimeOffset += Math.max(0, audiovideoTimestampDelta);
          videoTimeOffset += Math.max(0, -audiovideoTimestampDelta);
        }

        // Purposefully remuxing audio before video, so that remuxVideo can use nextAudioPts, which is calculated in remuxAudio.
        if (enoughAudioSamples) {
          // if initSegment was generated without audio samples, regenerate it again
          if (!audioTrack.samplerate) {
            logger.warn('[mp4-remuxer]: regenerate InitSegment as audio detected');
            initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
          }
          audio = this.remuxAudio(audioTrack, audioTimeOffset, this.isAudioContiguous, accurateTimeOffset, hasVideo || enoughVideoSamples || playlistType === PlaylistLevelType.AUDIO ? videoTimeOffset : undefined);
          if (enoughVideoSamples) {
            const audioTrackLength = audio ? audio.endPTS - audio.startPTS : 0;
            // if initSegment was generated without video samples, regenerate it again
            if (!videoTrack.inputTimeScale) {
              logger.warn('[mp4-remuxer]: regenerate InitSegment as video detected');
              initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
            }
            video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, audioTrackLength);
          }
        } else if (enoughVideoSamples) {
          video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, 0);
        }
        if (video) {
          video.firstKeyFrame = firstKeyFrameIndex;
          video.independent = firstKeyFrameIndex !== -1;
          video.firstKeyFramePTS = firstKeyFramePTS;
        }
      }
    }

    // Allow ID3 and text to remux, even if more audio/video samples are required
    if (this.ISGenerated && this._initPTS && this._initDTS) {
      if (id3Track.samples.length) {
        id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, this._initPTS, this._initDTS);
      }
      if (textTrack.samples.length) {
        text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, this._initPTS);
      }
    }
    return {
      audio,
      video,
      initSegment,
      independent,
      text,
      id3
    };
  }
  generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset) {
    const audioSamples = audioTrack.samples;
    const videoSamples = videoTrack.samples;
    const typeSupported = this.typeSupported;
    const tracks = {};
    const _initPTS = this._initPTS;
    let computePTSDTS = !_initPTS || accurateTimeOffset;
    let container = 'audio/mp4';
    let initPTS;
    let initDTS;
    let timescale;
    if (computePTSDTS) {
      initPTS = initDTS = Infinity;
    }
    if (audioTrack.config && audioSamples.length) {
      // let's use audio sampling rate as MP4 time scale.
      // rationale is that there is a integer nb of audio frames per audio sample (1024 for AAC)
      // using audio sampling rate here helps having an integer MP4 frame duration
      // this avoids potential rounding issue and AV sync issue
      audioTrack.timescale = audioTrack.samplerate;
      switch (audioTrack.segmentCodec) {
        case 'mp3':
          if (typeSupported.mpeg) {
            // Chrome and Safari
            container = 'audio/mpeg';
            audioTrack.codec = '';
          } else if (typeSupported.mp3) {
            // Firefox
            audioTrack.codec = 'mp3';
          }
          break;
      }
      tracks.audio = {
        id: 'audio',
        container: container,
        codec: audioTrack.codec,
        initSegment: audioTrack.segmentCodec === 'mp3' && typeSupported.mpeg ? new Uint8Array(0) : MP4.initSegment([audioTrack]),
        metadata: {
          channelCount: audioTrack.channelCount
        }
      };
      if (computePTSDTS) {
        timescale = audioTrack.inputTimeScale;
        if (!_initPTS || timescale !== _initPTS.timescale) {
          // remember first PTS of this demuxing context. for audio, PTS = DTS
          initPTS = initDTS = audioSamples[0].pts - Math.round(timescale * timeOffset);
        } else {
          computePTSDTS = false;
        }
      }
    }
    if (videoTrack.sps && videoTrack.pps && videoSamples.length) {
      // let's use input time scale as MP4 video timescale
      // we use input time scale straight away to avoid rounding issues on frame duration / cts computation
      videoTrack.timescale = videoTrack.inputTimeScale;
      tracks.video = {
        id: 'main',
        container: 'video/mp4',
        codec: videoTrack.codec,
        initSegment: MP4.initSegment([videoTrack]),
        metadata: {
          width: videoTrack.width,
          height: videoTrack.height
        }
      };
      if (computePTSDTS) {
        timescale = videoTrack.inputTimeScale;
        if (!_initPTS || timescale !== _initPTS.timescale) {
          const startPTS = this.getVideoStartPts(videoSamples);
          const startOffset = Math.round(timescale * timeOffset);
          initDTS = Math.min(initDTS, normalizePts(videoSamples[0].dts, startPTS) - startOffset);
          initPTS = Math.min(initPTS, startPTS - startOffset);
        } else {
          computePTSDTS = false;
        }
      }
    }
    if (Object.keys(tracks).length) {
      this.ISGenerated = true;
      if (computePTSDTS) {
        this._initPTS = {
          baseTime: initPTS,
          timescale: timescale
        };
        this._initDTS = {
          baseTime: initDTS,
          timescale: timescale
        };
      } else {
        initPTS = timescale = undefined;
      }
      return {
        tracks,
        initPTS,
        timescale
      };
    }
  }
  remuxVideo(track, timeOffset, contiguous, audioTrackLength) {
    const timeScale = track.inputTimeScale;
    const inputSamples = track.samples;
    const outputSamples = [];
    const nbSamples = inputSamples.length;
    const initPTS = this._initPTS;
    let nextAvcDts = this.nextAvcDts;
    let offset = 8;
    let mp4SampleDuration = this.videoSampleDuration;
    let firstDTS;
    let lastDTS;
    let minPTS = Number.POSITIVE_INFINITY;
    let maxPTS = Number.NEGATIVE_INFINITY;
    let sortSamples = false;

    // if parsed fragment is contiguous with last one, let's use last DTS value as reference
    if (!contiguous || nextAvcDts === null) {
      const pts = timeOffset * timeScale;
      const cts = inputSamples[0].pts - normalizePts(inputSamples[0].dts, inputSamples[0].pts);
      // if not contiguous, let's use target timeOffset
      nextAvcDts = pts - cts;
    }

    // PTS is coded on 33bits, and can loop from -2^32 to 2^32
    // PTSNormalize will make PTS/DTS value monotonic, we use last known DTS value as reference value
    const initTime = initPTS.baseTime * timeScale / initPTS.timescale;
    for (let i = 0; i < nbSamples; i++) {
      const sample = inputSamples[i];
      sample.pts = normalizePts(sample.pts - initTime, nextAvcDts);
      sample.dts = normalizePts(sample.dts - initTime, nextAvcDts);
      if (sample.dts < inputSamples[i > 0 ? i - 1 : i].dts) {
        sortSamples = true;
      }
    }

    // sort video samples by DTS then PTS then demux id order
    if (sortSamples) {
      inputSamples.sort(function (a, b) {
        const deltadts = a.dts - b.dts;
        const deltapts = a.pts - b.pts;
        return deltadts || deltapts;
      });
    }

    // Get first/last DTS
    firstDTS = inputSamples[0].dts;
    lastDTS = inputSamples[inputSamples.length - 1].dts;

    // Sample duration (as expected by trun MP4 boxes), should be the delta between sample DTS
    // set this constant duration as being the avg delta between consecutive DTS.
    const inputDuration = lastDTS - firstDTS;
    const averageSampleDuration = inputDuration ? Math.round(inputDuration / (nbSamples - 1)) : mp4SampleDuration || track.inputTimeScale / 30;

    // if fragment are contiguous, detect hole/overlapping between fragments
    if (contiguous) {
      // check timestamp continuity across consecutive fragments (this is to remove inter-fragment gap/hole)
      const delta = firstDTS - nextAvcDts;
      const foundHole = delta > averageSampleDuration;
      const foundOverlap = delta < -1;
      if (foundHole || foundOverlap) {
        if (foundHole) {
          logger.warn(`AVC: ${toMsFromMpegTsClock(delta, true)} ms (${delta}dts) hole between fragments detected, filling it`);
        } else {
          logger.warn(`AVC: ${toMsFromMpegTsClock(-delta, true)} ms (${delta}dts) overlapping between fragments detected`);
        }
        if (!foundOverlap || nextAvcDts >= inputSamples[0].pts) {
          firstDTS = nextAvcDts;
          const firstPTS = inputSamples[0].pts - delta;
          inputSamples[0].dts = firstDTS;
          inputSamples[0].pts = firstPTS;
          logger.log(`Video: First PTS/DTS adjusted: ${toMsFromMpegTsClock(firstPTS, true)}/${toMsFromMpegTsClock(firstDTS, true)}, delta: ${toMsFromMpegTsClock(delta, true)} ms`);
        }
      }
    }
    firstDTS = Math.max(0, firstDTS);
    let nbNalu = 0;
    let naluLen = 0;
    for (let i = 0; i < nbSamples; i++) {
      // compute total/avc sample length and nb of NAL units
      const sample = inputSamples[i];
      const units = sample.units;
      const nbUnits = units.length;
      let sampleLen = 0;
      for (let j = 0; j < nbUnits; j++) {
        sampleLen += units[j].data.length;
      }
      naluLen += sampleLen;
      nbNalu += nbUnits;
      sample.length = sampleLen;

      // ensure sample monotonic DTS
      sample.dts = Math.max(sample.dts, firstDTS);
      minPTS = Math.min(sample.pts, minPTS);
      maxPTS = Math.max(sample.pts, maxPTS);
    }
    lastDTS = inputSamples[nbSamples - 1].dts;

    /* concatenate the video data and construct the mdat in place
      (need 8 more bytes to fill length and mpdat type) */
    const mdatSize = naluLen + 4 * nbNalu + 8;
    let mdat;
    try {
      mdat = new Uint8Array(mdatSize);
    } catch (err) {
      this.observer.emit(Events.ERROR, Events.ERROR, {
        type: ErrorTypes.MUX_ERROR,
        details: ErrorDetails.REMUX_ALLOC_ERROR,
        fatal: false,
        error: err,
        bytes: mdatSize,
        reason: `fail allocating video mdat ${mdatSize}`
      });
      return;
    }
    const view = new DataView(mdat.buffer);
    view.setUint32(0, mdatSize);
    mdat.set(MP4.types.mdat, 4);
    let stretchedLastFrame = false;
    let minDtsDelta = Number.POSITIVE_INFINITY;
    let minPtsDelta = Number.POSITIVE_INFINITY;
    let maxDtsDelta = Number.NEGATIVE_INFINITY;
    let maxPtsDelta = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < nbSamples; i++) {
      const avcSample = inputSamples[i];
      const avcSampleUnits = avcSample.units;
      let mp4SampleLength = 0;
      // convert NALU bitstream to MP4 format (prepend NALU with size field)
      for (let j = 0, nbUnits = avcSampleUnits.length; j < nbUnits; j++) {
        const unit = avcSampleUnits[j];
        const unitData = unit.data;
        const unitDataLen = unit.data.byteLength;
        view.setUint32(offset, unitDataLen);
        offset += 4;
        mdat.set(unitData, offset);
        offset += unitDataLen;
        mp4SampleLength += 4 + unitDataLen;
      }

      // expected sample duration is the Decoding Timestamp diff of consecutive samples
      let ptsDelta;
      if (i < nbSamples - 1) {
        mp4SampleDuration = inputSamples[i + 1].dts - avcSample.dts;
        ptsDelta = inputSamples[i + 1].pts - avcSample.pts;
      } else {
        const config = this.config;
        const lastFrameDuration = i > 0 ? avcSample.dts - inputSamples[i - 1].dts : averageSampleDuration;
        ptsDelta = i > 0 ? avcSample.pts - inputSamples[i - 1].pts : averageSampleDuration;
        if (config.stretchShortVideoTrack && this.nextAudioPts !== null) {
          // In some cases, a segment's audio track duration may exceed the video track duration.
          // Since we've already remuxed audio, and we know how long the audio track is, we look to
          // see if the delta to the next segment is longer than maxBufferHole.
          // If so, playback would potentially get stuck, so we artificially inflate
          // the duration of the last frame to minimize any potential gap between segments.
          const gapTolerance = Math.floor(config.maxBufferHole * timeScale);
          const deltaToFrameEnd = (audioTrackLength ? minPTS + audioTrackLength * timeScale : this.nextAudioPts) - avcSample.pts;
          if (deltaToFrameEnd > gapTolerance) {
            // We subtract lastFrameDuration from deltaToFrameEnd to try to prevent any video
            // frame overlap. maxBufferHole should be >> lastFrameDuration anyway.
            mp4SampleDuration = deltaToFrameEnd - lastFrameDuration;
            if (mp4SampleDuration < 0) {
              mp4SampleDuration = lastFrameDuration;
            } else {
              stretchedLastFrame = true;
            }
            logger.log(`[mp4-remuxer]: It is approximately ${deltaToFrameEnd / 90} ms to the next segment; using duration ${mp4SampleDuration / 90} ms for the last video frame.`);
          } else {
            mp4SampleDuration = lastFrameDuration;
          }
        } else {
          mp4SampleDuration = lastFrameDuration;
        }
      }
      const compositionTimeOffset = Math.round(avcSample.pts - avcSample.dts);
      minDtsDelta = Math.min(minDtsDelta, mp4SampleDuration);
      maxDtsDelta = Math.max(maxDtsDelta, mp4SampleDuration);
      minPtsDelta = Math.min(minPtsDelta, ptsDelta);
      maxPtsDelta = Math.max(maxPtsDelta, ptsDelta);
      outputSamples.push(new Mp4Sample(avcSample.key, mp4SampleDuration, mp4SampleLength, compositionTimeOffset));
    }
    if (outputSamples.length) {
      if (chromeVersion) {
        if (chromeVersion < 70) {
          // Chrome workaround, mark first sample as being a Random Access Point (keyframe) to avoid sourcebuffer append issue
          // https://code.google.com/p/chromium/issues/detail?id=229412
          const flags = outputSamples[0].flags;
          flags.dependsOn = 2;
          flags.isNonSync = 0;
        }
      } else if (safariWebkitVersion) {
        // Fix for "CNN special report, with CC" in test-streams (Safari browser only)
        // Ignore DTS when frame durations are irregular. Safari MSE does not handle this leading to gaps.
        if (maxPtsDelta - minPtsDelta < maxDtsDelta - minDtsDelta && averageSampleDuration / maxDtsDelta < 0.025 && outputSamples[0].cts === 0) {
          logger.warn('Found irregular gaps in sample duration. Using PTS instead of DTS to determine MP4 sample duration.');
          let dts = firstDTS;
          for (let i = 0, len = outputSamples.length; i < len; i++) {
            const nextDts = dts + outputSamples[i].duration;
            const pts = dts + outputSamples[i].cts;
            if (i < len - 1) {
              const nextPts = nextDts + outputSamples[i + 1].cts;
              outputSamples[i].duration = nextPts - pts;
            } else {
              outputSamples[i].duration = i ? outputSamples[i - 1].duration : averageSampleDuration;
            }
            outputSamples[i].cts = 0;
            dts = nextDts;
          }
        }
      }
    }
    // next AVC sample DTS should be equal to last sample DTS + last sample duration (in PES timescale)
    mp4SampleDuration = stretchedLastFrame || !mp4SampleDuration ? averageSampleDuration : mp4SampleDuration;
    this.nextAvcDts = nextAvcDts = lastDTS + mp4SampleDuration;
    this.videoSampleDuration = mp4SampleDuration;
    this.isVideoContiguous = true;
    const moof = MP4.moof(track.sequenceNumber++, firstDTS, _extends({}, track, {
      samples: outputSamples
    }));
    const type = 'video';
    const data = {
      data1: moof,
      data2: mdat,
      startPTS: minPTS / timeScale,
      endPTS: (maxPTS + mp4SampleDuration) / timeScale,
      startDTS: firstDTS / timeScale,
      endDTS: nextAvcDts / timeScale,
      type,
      hasAudio: false,
      hasVideo: true,
      nb: outputSamples.length,
      dropped: track.dropped
    };
    track.samples = [];
    track.dropped = 0;
    return data;
  }
  remuxAudio(track, timeOffset, contiguous, accurateTimeOffset, videoTimeOffset) {
    const inputTimeScale = track.inputTimeScale;
    const mp4timeScale = track.samplerate ? track.samplerate : inputTimeScale;
    const scaleFactor = inputTimeScale / mp4timeScale;
    const mp4SampleDuration = track.segmentCodec === 'aac' ? AAC_SAMPLES_PER_FRAME : MPEG_AUDIO_SAMPLE_PER_FRAME;
    const inputSampleDuration = mp4SampleDuration * scaleFactor;
    const initPTS = this._initPTS;
    const rawMPEG = track.segmentCodec === 'mp3' && this.typeSupported.mpeg;
    const outputSamples = [];
    const alignedWithVideo = videoTimeOffset !== undefined;
    let inputSamples = track.samples;
    let offset = rawMPEG ? 0 : 8;
    let nextAudioPts = this.nextAudioPts || -1;

    // window.audioSamples ? window.audioSamples.push(inputSamples.map(s => s.pts)) : (window.audioSamples = [inputSamples.map(s => s.pts)]);

    // for audio samples, also consider consecutive fragments as being contiguous (even if a level switch occurs),
    // for sake of clarity:
    // consecutive fragments are frags with
    //  - less than 100ms gaps between new time offset (if accurate) and next expected PTS OR
    //  - less than 20 audio frames distance
    // contiguous fragments are consecutive fragments from same quality level (same level, new SN = old SN + 1)
    // this helps ensuring audio continuity
    // and this also avoids audio glitches/cut when switching quality, or reporting wrong duration on first audio frame
    const timeOffsetMpegTS = timeOffset * inputTimeScale;
    const initTime = initPTS.baseTime * inputTimeScale / initPTS.timescale;
    this.isAudioContiguous = contiguous = contiguous || inputSamples.length && nextAudioPts > 0 && (accurateTimeOffset && Math.abs(timeOffsetMpegTS - nextAudioPts) < 9000 || Math.abs(normalizePts(inputSamples[0].pts - initTime, timeOffsetMpegTS) - nextAudioPts) < 20 * inputSampleDuration);

    // compute normalized PTS
    inputSamples.forEach(function (sample) {
      sample.pts = normalizePts(sample.pts - initTime, timeOffsetMpegTS);
    });
    if (!contiguous || nextAudioPts < 0) {
      // filter out sample with negative PTS that are not playable anyway
      // if we don't remove these negative samples, they will shift all audio samples forward.
      // leading to audio overlap between current / next fragment
      inputSamples = inputSamples.filter(sample => sample.pts >= 0);

      // in case all samples have negative PTS, and have been filtered out, return now
      if (!inputSamples.length) {
        return;
      }
      if (videoTimeOffset === 0) {
        // Set the start to 0 to match video so that start gaps larger than inputSampleDuration are filled with silence
        nextAudioPts = 0;
      } else if (accurateTimeOffset && !alignedWithVideo) {
        // When not seeking, not live, and LevelDetails.PTSKnown, use fragment start as predicted next audio PTS
        nextAudioPts = Math.max(0, timeOffsetMpegTS);
      } else {
        // if frags are not contiguous and if we cant trust time offset, let's use first sample PTS as next audio PTS
        nextAudioPts = inputSamples[0].pts;
      }
    }

    // If the audio track is missing samples, the frames seem to get "left-shifted" within the
    // resulting mp4 segment, causing sync issues and leaving gaps at the end of the audio segment.
    // In an effort to prevent this from happening, we inject frames here where there are gaps.
    // When possible, we inject a silent frame; when that's not possible, we duplicate the last
    // frame.

    if (track.segmentCodec === 'aac') {
      const maxAudioFramesDrift = this.config.maxAudioFramesDrift;
      for (let i = 0, nextPts = nextAudioPts; i < inputSamples.length; i++) {
        // First, let's see how far off this frame is from where we expect it to be
        const sample = inputSamples[i];
        const pts = sample.pts;
        const delta = pts - nextPts;
        const duration = Math.abs(1000 * delta / inputTimeScale);

        // When remuxing with video, if we're overlapping by more than a duration, drop this sample to stay in sync
        if (delta <= -maxAudioFramesDrift * inputSampleDuration && alignedWithVideo) {
          if (i === 0) {
            logger.warn(`Audio frame @ ${(pts / inputTimeScale).toFixed(3)}s overlaps nextAudioPts by ${Math.round(1000 * delta / inputTimeScale)} ms.`);
            this.nextAudioPts = nextAudioPts = nextPts = pts;
          }
        } // eslint-disable-line brace-style

        // Insert missing frames if:
        // 1: We're more than maxAudioFramesDrift frame away
        // 2: Not more than MAX_SILENT_FRAME_DURATION away
        // 3: currentTime (aka nextPtsNorm) is not 0
        // 4: remuxing with video (videoTimeOffset !== undefined)
        else if (delta >= maxAudioFramesDrift * inputSampleDuration && duration < MAX_SILENT_FRAME_DURATION && alignedWithVideo) {
          let missing = Math.round(delta / inputSampleDuration);
          // Adjust nextPts so that silent samples are aligned with media pts. This will prevent media samples from
          // later being shifted if nextPts is based on timeOffset and delta is not a multiple of inputSampleDuration.
          nextPts = pts - missing * inputSampleDuration;
          if (nextPts < 0) {
            missing--;
            nextPts += inputSampleDuration;
          }
          if (i === 0) {
            this.nextAudioPts = nextAudioPts = nextPts;
          }
          logger.warn(`[mp4-remuxer]: Injecting ${missing} audio frame @ ${(nextPts / inputTimeScale).toFixed(3)}s due to ${Math.round(1000 * delta / inputTimeScale)} ms gap.`);
          for (let j = 0; j < missing; j++) {
            const newStamp = Math.max(nextPts, 0);
            let fillFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);
            if (!fillFrame) {
              logger.log('[mp4-remuxer]: Unable to get silent frame for given audio codec; duplicating last frame instead.');
              fillFrame = sample.unit.subarray();
            }
            inputSamples.splice(i, 0, {
              unit: fillFrame,
              pts: newStamp
            });
            nextPts += inputSampleDuration;
            i++;
          }
        }
        sample.pts = nextPts;
        nextPts += inputSampleDuration;
      }
    }
    let firstPTS = null;
    let lastPTS = null;
    let mdat;
    let mdatSize = 0;
    let sampleLength = inputSamples.length;
    while (sampleLength--) {
      mdatSize += inputSamples[sampleLength].unit.byteLength;
    }
    for (let j = 0, _nbSamples = inputSamples.length; j < _nbSamples; j++) {
      const audioSample = inputSamples[j];
      const unit = audioSample.unit;
      let pts = audioSample.pts;
      if (lastPTS !== null) {
        // If we have more than one sample, set the duration of the sample to the "real" duration; the PTS diff with
        // the previous sample
        const prevSample = outputSamples[j - 1];
        prevSample.duration = Math.round((pts - lastPTS) / scaleFactor);
      } else {
        if (contiguous && track.segmentCodec === 'aac') {
          // set PTS/DTS to expected PTS/DTS
          pts = nextAudioPts;
        }
        // remember first PTS of our audioSamples
        firstPTS = pts;
        if (mdatSize > 0) {
          /* concatenate the audio data and construct the mdat in place
            (need 8 more bytes to fill length and mdat type) */
          mdatSize += offset;
          try {
            mdat = new Uint8Array(mdatSize);
          } catch (err) {
            this.observer.emit(Events.ERROR, Events.ERROR, {
              type: ErrorTypes.MUX_ERROR,
              details: ErrorDetails.REMUX_ALLOC_ERROR,
              fatal: false,
              error: err,
              bytes: mdatSize,
              reason: `fail allocating audio mdat ${mdatSize}`
            });
            return;
          }
          if (!rawMPEG) {
            const view = new DataView(mdat.buffer);
            view.setUint32(0, mdatSize);
            mdat.set(MP4.types.mdat, 4);
          }
        } else {
          // no audio samples
          return;
        }
      }
      mdat.set(unit, offset);
      const unitLen = unit.byteLength;
      offset += unitLen;
      // Default the sample's duration to the computed mp4SampleDuration, which will either be 1024 for AAC or 1152 for MPEG
      // In the case that we have 1 sample, this will be the duration. If we have more than one sample, the duration
      // becomes the PTS diff with the previous sample
      outputSamples.push(new Mp4Sample(true, mp4SampleDuration, unitLen, 0));
      lastPTS = pts;
    }

    // We could end up with no audio samples if all input samples were overlapping with the previously remuxed ones
    const nbSamples = outputSamples.length;
    if (!nbSamples) {
      return;
    }

    // The next audio sample PTS should be equal to last sample PTS + duration
    const lastSample = outputSamples[outputSamples.length - 1];
    this.nextAudioPts = nextAudioPts = lastPTS + scaleFactor * lastSample.duration;

    // Set the track samples from inputSamples to outputSamples before remuxing
    const moof = rawMPEG ? new Uint8Array(0) : MP4.moof(track.sequenceNumber++, firstPTS / scaleFactor, _extends({}, track, {
      samples: outputSamples
    }));

    // Clear the track samples. This also clears the samples array in the demuxer, since the reference is shared
    track.samples = [];
    const start = firstPTS / inputTimeScale;
    const end = nextAudioPts / inputTimeScale;
    const type = 'audio';
    const audioData = {
      data1: moof,
      data2: mdat,
      startPTS: start,
      endPTS: end,
      startDTS: start,
      endDTS: end,
      type,
      hasAudio: true,
      hasVideo: false,
      nb: nbSamples
    };
    this.isAudioContiguous = true;
    return audioData;
  }
  remuxEmptyAudio(track, timeOffset, contiguous, videoData) {
    const inputTimeScale = track.inputTimeScale;
    const mp4timeScale = track.samplerate ? track.samplerate : inputTimeScale;
    const scaleFactor = inputTimeScale / mp4timeScale;
    const nextAudioPts = this.nextAudioPts;
    // sync with video's timestamp
    const initDTS = this._initDTS;
    const init90kHz = initDTS.baseTime * 90000 / initDTS.timescale;
    const startDTS = (nextAudioPts !== null ? nextAudioPts : videoData.startDTS * inputTimeScale) + init90kHz;
    const endDTS = videoData.endDTS * inputTimeScale + init90kHz;
    // one sample's duration value
    const frameDuration = scaleFactor * AAC_SAMPLES_PER_FRAME;
    // samples count of this segment's duration
    const nbSamples = Math.ceil((endDTS - startDTS) / frameDuration);
    // silent frame
    const silentFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);
    logger.warn('[mp4-remuxer]: remux empty Audio');
    // Can't remux if we can't generate a silent frame...
    if (!silentFrame) {
      logger.trace('[mp4-remuxer]: Unable to remuxEmptyAudio since we were unable to get a silent frame for given audio codec');
      return;
    }
    const samples = [];
    for (let i = 0; i < nbSamples; i++) {
      const stamp = startDTS + i * frameDuration;
      samples.push({
        unit: silentFrame,
        pts: stamp,
        dts: stamp
      });
    }
    track.samples = samples;
    return this.remuxAudio(track, timeOffset, contiguous, false);
  }
}
function normalizePts(value, reference) {
  let offset;
  if (reference === null) {
    return value;
  }
  if (reference < value) {
    // - 2^33
    offset = -8589934592;
  } else {
    // + 2^33
    offset = 8589934592;
  }
  /* PTS is 33bit (from 0 to 2^33 -1)
    if diff between value and reference is bigger than half of the amplitude (2^32) then it means that
    PTS looping occured. fill the gap */
  while (Math.abs(value - reference) > 4294967296) {
    value += offset;
  }
  return value;
}
function findKeyframeIndex(samples) {
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].key) {
      return i;
    }
  }
  return -1;
}
function flushTextTrackMetadataCueSamples(track, timeOffset, initPTS, initDTS) {
  const length = track.samples.length;
  if (!length) {
    return;
  }
  const inputTimeScale = track.inputTimeScale;
  for (let index = 0; index < length; index++) {
    const sample = track.samples[index];
    // setting id3 pts, dts to relative time
    // using this._initPTS and this._initDTS to calculate relative time
    sample.pts = normalizePts(sample.pts - initPTS.baseTime * inputTimeScale / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
    sample.dts = normalizePts(sample.dts - initDTS.baseTime * inputTimeScale / initDTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
  }
  const samples = track.samples;
  track.samples = [];
  return {
    samples
  };
}
function flushTextTrackUserdataCueSamples(track, timeOffset, initPTS) {
  const length = track.samples.length;
  if (!length) {
    return;
  }
  const inputTimeScale = track.inputTimeScale;
  for (let index = 0; index < length; index++) {
    const sample = track.samples[index];
    // setting text pts, dts to relative time
    // using this._initPTS and this._initDTS to calculate relative time
    sample.pts = normalizePts(sample.pts - initPTS.baseTime * inputTimeScale / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
  }
  track.samples.sort((a, b) => a.pts - b.pts);
  const samples = track.samples;
  track.samples = [];
  return {
    samples
  };
}
class Mp4Sample {
  constructor(isKeyframe, duration, size, cts) {
    this.size = void 0;
    this.duration = void 0;
    this.cts = void 0;
    this.flags = void 0;
    this.duration = duration;
    this.size = size;
    this.cts = cts;
    this.flags = new Mp4SampleFlags(isKeyframe);
  }
}
class Mp4SampleFlags {
  constructor(isKeyframe) {
    this.isLeading = 0;
    this.isDependedOn = 0;
    this.hasRedundancy = 0;
    this.degradPrio = 0;
    this.dependsOn = 1;
    this.isNonSync = 1;
    this.dependsOn = isKeyframe ? 2 : 1;
    this.isNonSync = isKeyframe ? 0 : 1;
  }
}

class PassThroughRemuxer {
  constructor() {
    this.emitInitSegment = false;
    this.audioCodec = void 0;
    this.videoCodec = void 0;
    this.initData = void 0;
    this.initPTS = null;
    this.initTracks = void 0;
    this.lastEndTime = null;
  }
  destroy() {}
  resetTimeStamp(defaultInitPTS) {
    this.initPTS = defaultInitPTS;
    this.lastEndTime = null;
  }
  resetNextTimestamp() {
    this.lastEndTime = null;
  }
  resetInitSegment(initSegment, audioCodec, videoCodec, decryptdata) {
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this.generateInitSegment(patchEncyptionData(initSegment, decryptdata));
    this.emitInitSegment = true;
  }
  generateInitSegment(initSegment) {
    let {
      audioCodec,
      videoCodec
    } = this;
    if (!(initSegment != null && initSegment.byteLength)) {
      this.initTracks = undefined;
      this.initData = undefined;
      return;
    }
    const initData = this.initData = parseInitSegment(initSegment);

    // Get codec from initSegment or fallback to default
    if (!audioCodec) {
      audioCodec = getParsedTrackCodec(initData.audio, ElementaryStreamTypes.AUDIO);
    }
    if (!videoCodec) {
      videoCodec = getParsedTrackCodec(initData.video, ElementaryStreamTypes.VIDEO);
    }
    const tracks = {};
    if (initData.audio && initData.video) {
      tracks.audiovideo = {
        container: 'video/mp4',
        codec: audioCodec + ',' + videoCodec,
        initSegment,
        id: 'main'
      };
    } else if (initData.audio) {
      tracks.audio = {
        container: 'audio/mp4',
        codec: audioCodec,
        initSegment,
        id: 'audio'
      };
    } else if (initData.video) {
      tracks.video = {
        container: 'video/mp4',
        codec: videoCodec,
        initSegment,
        id: 'main'
      };
    } else {
      logger.warn('[passthrough-remuxer.ts]: initSegment does not contain moov or trak boxes.');
    }
    this.initTracks = tracks;
  }
  remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset) {
    var _initData, _initData2;
    let {
      initPTS,
      lastEndTime
    } = this;
    const result = {
      audio: undefined,
      video: undefined,
      text: textTrack,
      id3: id3Track,
      initSegment: undefined
    };

    // If we haven't yet set a lastEndDTS, or it was reset, set it to the provided timeOffset. We want to use the
    // lastEndDTS over timeOffset whenever possible; during progressive playback, the media source will not update
    // the media duration (which is what timeOffset is provided as) before we need to process the next chunk.
    if (!isFiniteNumber(lastEndTime)) {
      lastEndTime = this.lastEndTime = timeOffset || 0;
    }

    // The binary segment data is added to the videoTrack in the mp4demuxer. We don't check to see if the data is only
    // audio or video (or both); adding it to video was an arbitrary choice.
    const data = videoTrack.samples;
    if (!(data != null && data.length)) {
      return result;
    }
    const initSegment = {
      initPTS: undefined,
      timescale: 1
    };
    let initData = this.initData;
    if (!((_initData = initData) != null && _initData.length)) {
      this.generateInitSegment(data);
      initData = this.initData;
    }
    if (!((_initData2 = initData) != null && _initData2.length)) {
      // We can't remux if the initSegment could not be generated
      logger.warn('[passthrough-remuxer.ts]: Failed to generate initSegment.');
      return result;
    }
    if (this.emitInitSegment) {
      initSegment.tracks = this.initTracks;
      this.emitInitSegment = false;
    }
    const duration = getDuration(data, initData);
    const startDTS = getStartDTS(initData, data);
    const decodeTime = startDTS === null ? timeOffset : startDTS;
    if (isInvalidInitPts(initPTS, decodeTime, timeOffset, duration) || initSegment.timescale !== initPTS.timescale && accurateTimeOffset) {
      initSegment.initPTS = decodeTime - timeOffset;
      if (initPTS && initPTS.timescale === 1) {
        logger.warn(`Adjusting initPTS by ${initSegment.initPTS - initPTS.baseTime}`);
      }
      this.initPTS = initPTS = {
        baseTime: initSegment.initPTS,
        timescale: 1
      };
    }
    const startTime = audioTrack ? decodeTime - initPTS.baseTime / initPTS.timescale : lastEndTime;
    const endTime = startTime + duration;
    offsetStartDTS(initData, data, initPTS.baseTime / initPTS.timescale);
    if (duration > 0) {
      this.lastEndTime = endTime;
    } else {
      logger.warn('Duration parsed from mp4 should be greater than zero');
      this.resetNextTimestamp();
    }
    const hasAudio = !!initData.audio;
    const hasVideo = !!initData.video;
    let type = '';
    if (hasAudio) {
      type += 'audio';
    }
    if (hasVideo) {
      type += 'video';
    }
    const track = {
      data1: data,
      startPTS: startTime,
      startDTS: startTime,
      endPTS: endTime,
      endDTS: endTime,
      type,
      hasAudio,
      hasVideo,
      nb: 1,
      dropped: 0
    };
    result.audio = track.type === 'audio' ? track : undefined;
    result.video = track.type !== 'audio' ? track : undefined;
    result.initSegment = initSegment;
    result.id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, initPTS, initPTS);
    if (textTrack.samples.length) {
      result.text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, initPTS);
    }
    return result;
  }
}
function isInvalidInitPts(initPTS, startDTS, timeOffset, duration) {
  if (initPTS === null) {
    return true;
  }
  // InitPTS is invalid when distance from program would be more than segment duration or a minimum of one second
  const minDuration = Math.max(duration, 1);
  const startTime = startDTS - initPTS.baseTime / initPTS.timescale;
  return Math.abs(startTime - timeOffset) > minDuration;
}
function getParsedTrackCodec(track, type) {
  const parsedCodec = track == null ? void 0 : track.codec;
  if (parsedCodec && parsedCodec.length > 4) {
    return parsedCodec;
  }
  // Since mp4-tools cannot parse full codec string (see 'TODO: Parse codec details'... in mp4-tools)
  // Provide defaults based on codec type
  // This allows for some playback of some fmp4 playlists without CODECS defined in manifest
  if (parsedCodec === 'hvc1' || parsedCodec === 'hev1') {
    return 'hvc1.1.6.L120.90';
  }
  if (parsedCodec === 'av01') {
    return 'av01.0.04M.08';
  }
  if (parsedCodec === 'avc1' || type === ElementaryStreamTypes.VIDEO) {
    return 'avc1.42e01e';
  }
  return 'mp4a.40.5';
}

let now;
// performance.now() not available on WebWorker, at least on Safari Desktop
try {
  now = self.performance.now.bind(self.performance);
} catch (err) {
  logger.debug('Unable to use Performance API on this environment');
  now = typeof self !== 'undefined' && self.Date.now;
}
const muxConfig = [{
  demux: MP4Demuxer,
  remux: PassThroughRemuxer
}, {
  demux: TSDemuxer,
  remux: MP4Remuxer
}, {
  demux: AACDemuxer,
  remux: MP4Remuxer
}, {
  demux: MP3Demuxer,
  remux: MP4Remuxer
}];
class Transmuxer {
  constructor(observer, typeSupported, config, vendor, id) {
    this.async = false;
    this.observer = void 0;
    this.typeSupported = void 0;
    this.config = void 0;
    this.vendor = void 0;
    this.id = void 0;
    this.demuxer = void 0;
    this.remuxer = void 0;
    this.decrypter = void 0;
    this.probe = void 0;
    this.decryptionPromise = null;
    this.transmuxConfig = void 0;
    this.currentTransmuxState = void 0;
    this.observer = observer;
    this.typeSupported = typeSupported;
    this.config = config;
    this.vendor = vendor;
    this.id = id;
  }
  configure(transmuxConfig) {
    this.transmuxConfig = transmuxConfig;
    if (this.decrypter) {
      this.decrypter.reset();
    }
  }
  push(data, decryptdata, chunkMeta, state) {
    const stats = chunkMeta.transmuxing;
    stats.executeStart = now();
    let uintData = new Uint8Array(data);
    const {
      currentTransmuxState,
      transmuxConfig
    } = this;
    if (state) {
      this.currentTransmuxState = state;
    }
    const {
      contiguous,
      discontinuity,
      trackSwitch,
      accurateTimeOffset,
      timeOffset,
      initSegmentChange
    } = state || currentTransmuxState;
    const {
      audioCodec,
      videoCodec,
      defaultInitPts,
      duration,
      initSegmentData
    } = transmuxConfig;
    const keyData = getEncryptionType(uintData, decryptdata);
    if (keyData && keyData.method === 'AES-128') {
      const decrypter = this.getDecrypter();
      // Software decryption is synchronous; webCrypto is not
      if (decrypter.isSync()) {
        // Software decryption is progressive. Progressive decryption may not return a result on each call. Any cached
        // data is handled in the flush() call
        let decryptedData = decrypter.softwareDecrypt(uintData, keyData.key.buffer, keyData.iv.buffer);
        // For Low-Latency HLS Parts, decrypt in place, since part parsing is expected on push progress
        const loadingParts = chunkMeta.part > -1;
        if (loadingParts) {
          decryptedData = decrypter.flush();
        }
        if (!decryptedData) {
          stats.executeEnd = now();
          return emptyResult(chunkMeta);
        }
        uintData = new Uint8Array(decryptedData);
      } else {
        this.decryptionPromise = decrypter.webCryptoDecrypt(uintData, keyData.key.buffer, keyData.iv.buffer).then(decryptedData => {
          // Calling push here is important; if flush() is called while this is still resolving, this ensures that
          // the decrypted data has been transmuxed
          const result = this.push(decryptedData, null, chunkMeta);
          this.decryptionPromise = null;
          return result;
        });
        return this.decryptionPromise;
      }
    }
    const resetMuxers = this.needsProbing(discontinuity, trackSwitch);
    if (resetMuxers) {
      const error = this.configureTransmuxer(uintData);
      if (error) {
        logger.warn(`[transmuxer] ${error.message}`);
        this.observer.emit(Events.ERROR, Events.ERROR, {
          type: ErrorTypes.MEDIA_ERROR,
          details: ErrorDetails.FRAG_PARSING_ERROR,
          fatal: false,
          error,
          reason: error.message
        });
        stats.executeEnd = now();
        return emptyResult(chunkMeta);
      }
    }
    if (discontinuity || trackSwitch || initSegmentChange || resetMuxers) {
      this.resetInitSegment(initSegmentData, audioCodec, videoCodec, duration, decryptdata);
    }
    if (discontinuity || initSegmentChange || resetMuxers) {
      this.resetInitialTimestamp(defaultInitPts);
    }
    if (!contiguous) {
      this.resetContiguity();
    }
    const result = this.transmux(uintData, keyData, timeOffset, accurateTimeOffset, chunkMeta);
    const currentState = this.currentTransmuxState;
    currentState.contiguous = true;
    currentState.discontinuity = false;
    currentState.trackSwitch = false;
    stats.executeEnd = now();
    return result;
  }

  // Due to data caching, flush calls can produce more than one TransmuxerResult (hence the Array type)
  flush(chunkMeta) {
    const stats = chunkMeta.transmuxing;
    stats.executeStart = now();
    const {
      decrypter,
      currentTransmuxState,
      decryptionPromise
    } = this;
    if (decryptionPromise) {
      // Upon resolution, the decryption promise calls push() and returns its TransmuxerResult up the stack. Therefore
      // only flushing is required for async decryption
      return decryptionPromise.then(() => {
        return this.flush(chunkMeta);
      });
    }
    const transmuxResults = [];
    const {
      timeOffset
    } = currentTransmuxState;
    if (decrypter) {
      // The decrypter may have data cached, which needs to be demuxed. In this case we'll have two TransmuxResults
      // This happens in the case that we receive only 1 push call for a segment (either for non-progressive downloads,
      // or for progressive downloads with small segments)
      const decryptedData = decrypter.flush();
      if (decryptedData) {
        // Push always returns a TransmuxerResult if decryptdata is null
        transmuxResults.push(this.push(decryptedData, null, chunkMeta));
      }
    }
    const {
      demuxer,
      remuxer
    } = this;
    if (!demuxer || !remuxer) {
      // If probing failed, then Hls.js has been given content its not able to handle
      stats.executeEnd = now();
      return [emptyResult(chunkMeta)];
    }
    const demuxResultOrPromise = demuxer.flush(timeOffset);
    if (isPromise(demuxResultOrPromise)) {
      // Decrypt final SAMPLE-AES samples
      return demuxResultOrPromise.then(demuxResult => {
        this.flushRemux(transmuxResults, demuxResult, chunkMeta);
        return transmuxResults;
      });
    }
    this.flushRemux(transmuxResults, demuxResultOrPromise, chunkMeta);
    return transmuxResults;
  }
  flushRemux(transmuxResults, demuxResult, chunkMeta) {
    const {
      audioTrack,
      videoTrack,
      id3Track,
      textTrack
    } = demuxResult;
    const {
      accurateTimeOffset,
      timeOffset
    } = this.currentTransmuxState;
    logger.log(`[transmuxer.ts]: Flushed fragment ${chunkMeta.sn}${chunkMeta.part > -1 ? ' p: ' + chunkMeta.part : ''} of level ${chunkMeta.level}`);
    const remuxResult = this.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, true, this.id);
    transmuxResults.push({
      remuxResult,
      chunkMeta
    });
    chunkMeta.transmuxing.executeEnd = now();
  }
  resetInitialTimestamp(defaultInitPts) {
    const {
      demuxer,
      remuxer
    } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetTimeStamp(defaultInitPts);
    remuxer.resetTimeStamp(defaultInitPts);
  }
  resetContiguity() {
    const {
      demuxer,
      remuxer
    } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetContiguity();
    remuxer.resetNextTimestamp();
  }
  resetInitSegment(initSegmentData, audioCodec, videoCodec, trackDuration, decryptdata) {
    const {
      demuxer,
      remuxer
    } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, trackDuration);
    remuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, decryptdata);
  }
  destroy() {
    if (this.demuxer) {
      this.demuxer.destroy();
      this.demuxer = undefined;
    }
    if (this.remuxer) {
      this.remuxer.destroy();
      this.remuxer = undefined;
    }
  }
  transmux(data, keyData, timeOffset, accurateTimeOffset, chunkMeta) {
    let result;
    if (keyData && keyData.method === 'SAMPLE-AES') {
      result = this.transmuxSampleAes(data, keyData, timeOffset, accurateTimeOffset, chunkMeta);
    } else {
      result = this.transmuxUnencrypted(data, timeOffset, accurateTimeOffset, chunkMeta);
    }
    return result;
  }
  transmuxUnencrypted(data, timeOffset, accurateTimeOffset, chunkMeta) {
    const {
      audioTrack,
      videoTrack,
      id3Track,
      textTrack
    } = this.demuxer.demux(data, timeOffset, false, !this.config.progressive);
    const remuxResult = this.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, false, this.id);
    return {
      remuxResult,
      chunkMeta
    };
  }
  transmuxSampleAes(data, decryptData, timeOffset, accurateTimeOffset, chunkMeta) {
    return this.demuxer.demuxSampleAes(data, decryptData, timeOffset).then(demuxResult => {
      const remuxResult = this.remuxer.remux(demuxResult.audioTrack, demuxResult.videoTrack, demuxResult.id3Track, demuxResult.textTrack, timeOffset, accurateTimeOffset, false, this.id);
      return {
        remuxResult,
        chunkMeta
      };
    });
  }
  configureTransmuxer(data) {
    const {
      config,
      observer,
      typeSupported,
      vendor
    } = this;
    // probe for content type
    let mux;
    for (let i = 0, len = muxConfig.length; i < len; i++) {
      if (muxConfig[i].demux.probe(data)) {
        mux = muxConfig[i];
        break;
      }
    }
    if (!mux) {
      return new Error('Failed to find demuxer by probing fragment data');
    }
    // so let's check that current remuxer and demuxer are still valid
    const demuxer = this.demuxer;
    const remuxer = this.remuxer;
    const Remuxer = mux.remux;
    const Demuxer = mux.demux;
    if (!remuxer || !(remuxer instanceof Remuxer)) {
      this.remuxer = new Remuxer(observer, config, typeSupported, vendor);
    }
    if (!demuxer || !(demuxer instanceof Demuxer)) {
      this.demuxer = new Demuxer(observer, config, typeSupported);
      this.probe = Demuxer.probe;
    }
  }
  needsProbing(discontinuity, trackSwitch) {
    // in case of continuity change, or track switch
    // we might switch from content type (AAC container to TS container, or TS to fmp4 for example)
    return !this.demuxer || !this.remuxer || discontinuity || trackSwitch;
  }
  getDecrypter() {
    let decrypter = this.decrypter;
    if (!decrypter) {
      decrypter = this.decrypter = new Decrypter(this.config);
    }
    return decrypter;
  }
}
function getEncryptionType(data, decryptData) {
  let encryptionType = null;
  if (data.byteLength > 0 && decryptData != null && decryptData.key != null && decryptData.iv !== null && decryptData.method != null) {
    encryptionType = decryptData;
  }
  return encryptionType;
}
const emptyResult = chunkMeta => ({
  remuxResult: {},
  chunkMeta
});
function isPromise(p) {
  return 'then' in p && p.then instanceof Function;
}
class TransmuxConfig {
  constructor(audioCodec, videoCodec, initSegmentData, duration, defaultInitPts) {
    this.audioCodec = void 0;
    this.videoCodec = void 0;
    this.initSegmentData = void 0;
    this.duration = void 0;
    this.defaultInitPts = void 0;
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this.initSegmentData = initSegmentData;
    this.duration = duration;
    this.defaultInitPts = defaultInitPts || null;
  }
}
class TransmuxState {
  constructor(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange) {
    this.discontinuity = void 0;
    this.contiguous = void 0;
    this.accurateTimeOffset = void 0;
    this.trackSwitch = void 0;
    this.timeOffset = void 0;
    this.initSegmentChange = void 0;
    this.discontinuity = discontinuity;
    this.contiguous = contiguous;
    this.accurateTimeOffset = accurateTimeOffset;
    this.trackSwitch = trackSwitch;
    this.timeOffset = timeOffset;
    this.initSegmentChange = initSegmentChange;
  }
}

var eventemitter3 = {exports: {}};

(function (module) {

	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';

	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @private
	 */
	function Events() {}

	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);

	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}

	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Add a listener for a given event.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} once Specify if the listener is a one-time listener.
	 * @returns {EventEmitter}
	 * @private
	 */
	function addListener(emitter, event, fn, context, once) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('The listener must be a function');
	  }

	  var listener = new EE(fn, context || emitter, once)
	    , evt = prefix ? prefix + event : event;

	  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	  else emitter._events[evt] = [emitter._events[evt], listener];

	  return emitter;
	}

	/**
	 * Clear event by name.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} evt The Event name.
	 * @private
	 */
	function clearEvent(emitter, evt) {
	  if (--emitter._eventsCount === 0) emitter._events = new Events();
	  else delete emitter._events[evt];
	}

	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;

	  if (this._eventsCount === 0) return names;

	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Array} The registered listeners.
	 * @public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  var evt = prefix ? prefix + event : event
	    , handlers = this._events[evt];

	  if (!handlers) return [];
	  if (handlers.fn) return [handlers.fn];

	  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	    ee[i] = handlers[i].fn;
	  }

	  return ee;
	};

	/**
	 * Return the number of listeners listening to a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Number} The number of listeners.
	 * @public
	 */
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
	  var evt = prefix ? prefix + event : event
	    , listeners = this._events[evt];

	  if (!listeners) return 0;
	  if (listeners.fn) return 1;
	  return listeners.length;
	};

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Add a listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  return addListener(this, event, fn, context, false);
	};

	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  return addListener(this, event, fn, context, true);
	};

	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {*} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return this;
	  if (!fn) {
	    clearEvent(this, evt);
	    return this;
	  }

	  var listeners = this._events[evt];

	  if (listeners.fn) {
	    if (
	      listeners.fn === fn &&
	      (!once || listeners.once) &&
	      (!context || listeners.context === context)
	    ) {
	      clearEvent(this, evt);
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	        listeners[i].fn !== fn ||
	        (once && !listeners[i].once) ||
	        (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }

	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else clearEvent(this, evt);
	  }

	  return this;
	};

	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {(String|Symbol)} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;

	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) clearEvent(this, evt);
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;

	//
	// Expose the module.
	//
	{
	  module.exports = EventEmitter;
	}
} (eventemitter3));

var eventemitter3Exports = eventemitter3.exports;
var EventEmitter = /*@__PURE__*/getDefaultExportFromCjs(eventemitter3Exports);

const MediaSource$1 = getMediaSource() || {
  isTypeSupported: () => false
};
class TransmuxerInterface {
  constructor(hls, id, onTransmuxComplete, onFlush) {
    this.error = null;
    this.hls = void 0;
    this.id = void 0;
    this.observer = void 0;
    this.frag = null;
    this.part = null;
    this.useWorker = void 0;
    this.workerContext = null;
    this.onwmsg = void 0;
    this.transmuxer = null;
    this.onTransmuxComplete = void 0;
    this.onFlush = void 0;
    const config = hls.config;
    this.hls = hls;
    this.id = id;
    this.useWorker = !!config.enableWorker;
    this.onTransmuxComplete = onTransmuxComplete;
    this.onFlush = onFlush;
    const forwardMessage = (ev, data) => {
      data = data || {};
      data.frag = this.frag;
      data.id = this.id;
      if (ev === Events.ERROR) {
        this.error = data.error;
      }
      this.hls.trigger(ev, data);
    };

    // forward events to main thread
    this.observer = new EventEmitter();
    this.observer.on(Events.FRAG_DECRYPTED, forwardMessage);
    this.observer.on(Events.ERROR, forwardMessage);
    const typeSupported = {
      mp4: MediaSource$1.isTypeSupported('video/mp4'),
      mpeg: MediaSource$1.isTypeSupported('audio/mpeg'),
      mp3: MediaSource$1.isTypeSupported('audio/mp4; codecs="mp3"')
    };
    // navigator.vendor is not always available in Web Worker
    // refer to https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/navigator
    const vendor = navigator.vendor;
    if (this.useWorker && typeof Worker !== 'undefined') {
      const canCreateWorker = config.workerPath || hasUMDWorker();
      if (canCreateWorker) {
        try {
          if (config.workerPath) {
            logger.log(`loading Web Worker ${config.workerPath} for "${id}"`);
            this.workerContext = loadWorker(config.workerPath);
          } else {
            logger.log(`injecting Web Worker for "${id}"`);
            this.workerContext = injectWorker();
          }
          this.onwmsg = ev => this.onWorkerMessage(ev);
          const {
            worker
          } = this.workerContext;
          worker.addEventListener('message', this.onwmsg);
          worker.onerror = event => {
            const error = new Error(`${event.message}  (${event.filename}:${event.lineno})`);
            config.enableWorker = false;
            logger.warn(`Error in "${id}" Web Worker, fallback to inline`);
            this.hls.trigger(Events.ERROR, {
              type: ErrorTypes.OTHER_ERROR,
              details: ErrorDetails.INTERNAL_EXCEPTION,
              fatal: false,
              event: 'demuxerWorker',
              error
            });
          };
          worker.postMessage({
            cmd: 'init',
            typeSupported: typeSupported,
            vendor: vendor,
            id: id,
            config: JSON.stringify(config)
          });
        } catch (err) {
          logger.warn(`Error setting up "${id}" Web Worker, fallback to inline`, err);
          this.resetWorker();
          this.error = null;
          this.transmuxer = new Transmuxer(this.observer, typeSupported, config, vendor, id);
        }
        return;
      }
    }
    this.transmuxer = new Transmuxer(this.observer, typeSupported, config, vendor, id);
  }
  resetWorker() {
    if (this.workerContext) {
      const {
        worker,
        objectURL
      } = this.workerContext;
      if (objectURL) {
        // revoke the Object URL that was used to create transmuxer worker, so as not to leak it
        self.URL.revokeObjectURL(objectURL);
      }
      worker.removeEventListener('message', this.onwmsg);
      worker.onerror = null;
      worker.terminate();
      this.workerContext = null;
    }
  }
  destroy() {
    if (this.workerContext) {
      this.resetWorker();
      this.onwmsg = undefined;
    } else {
      const transmuxer = this.transmuxer;
      if (transmuxer) {
        transmuxer.destroy();
        this.transmuxer = null;
      }
    }
    const observer = this.observer;
    if (observer) {
      observer.removeAllListeners();
    }
    this.frag = null;
    // @ts-ignore
    this.observer = null;
    // @ts-ignore
    this.hls = null;
  }
  push(data, initSegmentData, audioCodec, videoCodec, frag, part, duration, accurateTimeOffset, chunkMeta, defaultInitPTS) {
    var _frag$initSegment, _lastFrag$initSegment;
    chunkMeta.transmuxing.start = self.performance.now();
    const {
      transmuxer
    } = this;
    const timeOffset = part ? part.start : frag.start;
    // TODO: push "clear-lead" decrypt data for unencrypted fragments in streams with encrypted ones
    const decryptdata = frag.decryptdata;
    const lastFrag = this.frag;
    const discontinuity = !(lastFrag && frag.cc === lastFrag.cc);
    const trackSwitch = !(lastFrag && chunkMeta.level === lastFrag.level);
    const snDiff = lastFrag ? chunkMeta.sn - lastFrag.sn : -1;
    const partDiff = this.part ? chunkMeta.part - this.part.index : -1;
    const progressive = snDiff === 0 && chunkMeta.id > 1 && chunkMeta.id === (lastFrag == null ? void 0 : lastFrag.stats.chunkCount);
    const contiguous = !trackSwitch && (snDiff === 1 || snDiff === 0 && (partDiff === 1 || progressive && partDiff <= 0));
    const now = self.performance.now();
    if (trackSwitch || snDiff || frag.stats.parsing.start === 0) {
      frag.stats.parsing.start = now;
    }
    if (part && (partDiff || !contiguous)) {
      part.stats.parsing.start = now;
    }
    const initSegmentChange = !(lastFrag && ((_frag$initSegment = frag.initSegment) == null ? void 0 : _frag$initSegment.url) === ((_lastFrag$initSegment = lastFrag.initSegment) == null ? void 0 : _lastFrag$initSegment.url));
    const state = new TransmuxState(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange);
    if (!contiguous || discontinuity || initSegmentChange) {
      logger.log(`[transmuxer-interface, ${frag.type}]: Starting new transmux session for sn: ${chunkMeta.sn} p: ${chunkMeta.part} level: ${chunkMeta.level} id: ${chunkMeta.id}
        discontinuity: ${discontinuity}
        trackSwitch: ${trackSwitch}
        contiguous: ${contiguous}
        accurateTimeOffset: ${accurateTimeOffset}
        timeOffset: ${timeOffset}
        initSegmentChange: ${initSegmentChange}`);
      const config = new TransmuxConfig(audioCodec, videoCodec, initSegmentData, duration, defaultInitPTS);
      this.configureTransmuxer(config);
    }
    this.frag = frag;
    this.part = part;

    // Frags with sn of 'initSegment' are not transmuxed
    if (this.workerContext) {
      // post fragment payload as transferable objects for ArrayBuffer (no copy)
      this.workerContext.worker.postMessage({
        cmd: 'demux',
        data,
        decryptdata,
        chunkMeta,
        state
      }, data instanceof ArrayBuffer ? [data] : []);
    } else if (transmuxer) {
      const transmuxResult = transmuxer.push(data, decryptdata, chunkMeta, state);
      if (isPromise(transmuxResult)) {
        transmuxer.async = true;
        transmuxResult.then(data => {
          this.handleTransmuxComplete(data);
        }).catch(error => {
          this.transmuxerError(error, chunkMeta, 'transmuxer-interface push error');
        });
      } else {
        transmuxer.async = false;
        this.handleTransmuxComplete(transmuxResult);
      }
    }
  }
  flush(chunkMeta) {
    chunkMeta.transmuxing.start = self.performance.now();
    const {
      transmuxer
    } = this;
    if (this.workerContext) {
      this.workerContext.worker.postMessage({
        cmd: 'flush',
        chunkMeta
      });
    } else if (transmuxer) {
      let transmuxResult = transmuxer.flush(chunkMeta);
      const asyncFlush = isPromise(transmuxResult);
      if (asyncFlush || transmuxer.async) {
        if (!isPromise(transmuxResult)) {
          transmuxResult = Promise.resolve(transmuxResult);
        }
        transmuxResult.then(data => {
          this.handleFlushResult(data, chunkMeta);
        }).catch(error => {
          this.transmuxerError(error, chunkMeta, 'transmuxer-interface flush error');
        });
      } else {
        this.handleFlushResult(transmuxResult, chunkMeta);
      }
    }
  }
  transmuxerError(error, chunkMeta, reason) {
    if (!this.hls) {
      return;
    }
    this.error = error;
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.FRAG_PARSING_ERROR,
      chunkMeta,
      fatal: false,
      error,
      err: error,
      reason
    });
  }
  handleFlushResult(results, chunkMeta) {
    results.forEach(result => {
      this.handleTransmuxComplete(result);
    });
    this.onFlush(chunkMeta);
  }
  onWorkerMessage(ev) {
    const data = ev.data;
    const hls = this.hls;
    switch (data.event) {
      case 'init':
        {
          var _this$workerContext;
          const objectURL = (_this$workerContext = this.workerContext) == null ? void 0 : _this$workerContext.objectURL;
          if (objectURL) {
            // revoke the Object URL that was used to create transmuxer worker, so as not to leak it
            self.URL.revokeObjectURL(objectURL);
          }
          break;
        }
      case 'transmuxComplete':
        {
          this.handleTransmuxComplete(data.data);
          break;
        }
      case 'flush':
        {
          this.onFlush(data.data);
          break;
        }

      // pass logs from the worker thread to the main logger
      case 'workerLog':
        if (logger[data.data.logType]) {
          logger[data.data.logType](data.data.message);
        }
        break;
      default:
        {
          data.data = data.data || {};
          data.data.frag = this.frag;
          data.data.id = this.id;
          hls.trigger(data.event, data.data);
          break;
        }
    }
  }
  configureTransmuxer(config) {
    const {
      transmuxer
    } = this;
    if (this.workerContext) {
      this.workerContext.worker.postMessage({
        cmd: 'configure',
        config
      });
    } else if (transmuxer) {
      transmuxer.configure(config);
    }
  }
  handleTransmuxComplete(result) {
    result.chunkMeta.transmuxing.end = self.performance.now();
    this.onTransmuxComplete(result);
  }
}

const STALL_MINIMUM_DURATION_MS = 250;
const MAX_START_GAP_JUMP = 2.0;
const SKIP_BUFFER_HOLE_STEP_SECONDS = 0.1;
const SKIP_BUFFER_RANGE_START = 0.05;
class GapController {
  constructor(config, media, fragmentTracker, hls) {
    this.config = void 0;
    this.media = null;
    this.fragmentTracker = void 0;
    this.hls = void 0;
    this.nudgeRetry = 0;
    this.stallReported = false;
    this.stalled = null;
    this.moved = false;
    this.seeking = false;
    this.config = config;
    this.media = media;
    this.fragmentTracker = fragmentTracker;
    this.hls = hls;
  }
  destroy() {
    this.media = null;
    // @ts-ignore
    this.hls = this.fragmentTracker = null;
  }

  /**
   * Checks if the playhead is stuck within a gap, and if so, attempts to free it.
   * A gap is an unbuffered range between two buffered ranges (or the start and the first buffered range).
   *
   * @param lastCurrentTime - Previously read playhead position
   */
  poll(lastCurrentTime, activeFrag) {
    const {
      config,
      media,
      stalled
    } = this;
    if (media === null) {
      return;
    }
    const {
      currentTime,
      seeking
    } = media;
    const seeked = this.seeking && !seeking;
    const beginSeek = !this.seeking && seeking;
    this.seeking = seeking;

    // The playhead is moving, no-op
    if (currentTime !== lastCurrentTime) {
      this.moved = true;
      if (stalled !== null) {
        // The playhead is now moving, but was previously stalled
        if (this.stallReported) {
          const _stalledDuration = self.performance.now() - stalled;
          logger.warn(`playback not stuck anymore @${currentTime}, after ${Math.round(_stalledDuration)}ms`);
          this.stallReported = false;
        }
        this.stalled = null;
        this.nudgeRetry = 0;
      }
      return;
    }

    // Clear stalled state when beginning or finishing seeking so that we don't report stalls coming out of a seek
    if (beginSeek || seeked) {
      this.stalled = null;
      return;
    }

    // The playhead should not be moving
    if (media.paused && !seeking || media.ended || media.playbackRate === 0 || !BufferHelper.getBuffered(media).length) {
      return;
    }
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const isBuffered = bufferInfo.len > 0;
    const nextStart = bufferInfo.nextStart || 0;

    // There is no playable buffer (seeked, waiting for buffer)
    if (!isBuffered && !nextStart) {
      return;
    }
    if (seeking) {
      // Waiting for seeking in a buffered range to complete
      const hasEnoughBuffer = bufferInfo.len > MAX_START_GAP_JUMP;
      // Next buffered range is too far ahead to jump to while still seeking
      const noBufferGap = !nextStart || activeFrag && activeFrag.start <= currentTime || nextStart - currentTime > MAX_START_GAP_JUMP && !this.fragmentTracker.getPartialFragment(currentTime);
      if (hasEnoughBuffer || noBufferGap) {
        return;
      }
      // Reset moved state when seeking to a point in or before a gap
      this.moved = false;
    }

    // Skip start gaps if we haven't played, but the last poll detected the start of a stall
    // The addition poll gives the browser a chance to jump the gap for us
    if (!this.moved && this.stalled !== null) {
      var _level$details;
      // Jump start gaps within jump threshold
      const startJump = Math.max(nextStart, bufferInfo.start || 0) - currentTime;

      // When joining a live stream with audio tracks, account for live playlist window sliding by allowing
      // a larger jump over start gaps caused by the audio-stream-controller buffering a start fragment
      // that begins over 1 target duration after the video start position.
      const level = this.hls.levels ? this.hls.levels[this.hls.currentLevel] : null;
      const isLive = level == null ? void 0 : (_level$details = level.details) == null ? void 0 : _level$details.live;
      const maxStartGapJump = isLive ? level.details.targetduration * 2 : MAX_START_GAP_JUMP;
      const partialOrGap = this.fragmentTracker.getPartialFragment(currentTime);
      if (startJump > 0 && (startJump <= maxStartGapJump || partialOrGap)) {
        this._trySkipBufferHole(partialOrGap);
        return;
      }
    }

    // Start tracking stall time
    const tnow = self.performance.now();
    if (stalled === null) {
      this.stalled = tnow;
      return;
    }
    const stalledDuration = tnow - stalled;
    if (!seeking && stalledDuration >= STALL_MINIMUM_DURATION_MS) {
      // Report stalling after trying to fix
      this._reportStall(bufferInfo);
      if (!this.media) {
        return;
      }
    }
    const bufferedWithHoles = BufferHelper.bufferInfo(media, currentTime, config.maxBufferHole);
    this._tryFixBufferStall(bufferedWithHoles, stalledDuration);
  }

  /**
   * Detects and attempts to fix known buffer stalling issues.
   * @param bufferInfo - The properties of the current buffer.
   * @param stalledDurationMs - The amount of time Hls.js has been stalling for.
   * @private
   */
  _tryFixBufferStall(bufferInfo, stalledDurationMs) {
    const {
      config,
      fragmentTracker,
      media
    } = this;
    if (media === null) {
      return;
    }
    const currentTime = media.currentTime;
    const partial = fragmentTracker.getPartialFragment(currentTime);
    if (partial) {
      // Try to skip over the buffer hole caused by a partial fragment
      // This method isn't limited by the size of the gap between buffered ranges
      const targetTime = this._trySkipBufferHole(partial);
      // we return here in this case, meaning
      // the branch below only executes when we haven't seeked to a new position
      if (targetTime || !this.media) {
        return;
      }
    }

    // if we haven't had to skip over a buffer hole of a partial fragment
    // we may just have to "nudge" the playlist as the browser decoding/rendering engine
    // needs to cross some sort of threshold covering all source-buffers content
    // to start playing properly.
    if ((bufferInfo.len > config.maxBufferHole || bufferInfo.nextStart && bufferInfo.nextStart - currentTime < config.maxBufferHole) && stalledDurationMs > config.highBufferWatchdogPeriod * 1000) {
      logger.warn('Trying to nudge playhead over buffer-hole');
      // Try to nudge currentTime over a buffer hole if we've been stalling for the configured amount of seconds
      // We only try to jump the hole if it's under the configured size
      // Reset stalled so to rearm watchdog timer
      this.stalled = null;
      this._tryNudgeBuffer();
    }
  }

  /**
   * Triggers a BUFFER_STALLED_ERROR event, but only once per stall period.
   * @param bufferLen - The playhead distance from the end of the current buffer segment.
   * @private
   */
  _reportStall(bufferInfo) {
    const {
      hls,
      media,
      stallReported
    } = this;
    if (!stallReported && media) {
      // Report stalled error once
      this.stallReported = true;
      const error = new Error(`Playback stalling at @${media.currentTime} due to low buffer (${JSON.stringify(bufferInfo)})`);
      logger.warn(error.message);
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_STALLED_ERROR,
        fatal: false,
        error,
        buffer: bufferInfo.len
      });
    }
  }

  /**
   * Attempts to fix buffer stalls by jumping over known gaps caused by partial fragments
   * @param partial - The partial fragment found at the current time (where playback is stalling).
   * @private
   */
  _trySkipBufferHole(partial) {
    const {
      config,
      hls,
      media
    } = this;
    if (media === null) {
      return 0;
    }

    // Check if currentTime is between unbuffered regions of partial fragments
    const currentTime = media.currentTime;
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const startTime = currentTime < bufferInfo.start ? bufferInfo.start : bufferInfo.nextStart;
    if (startTime) {
      const bufferStarved = bufferInfo.len <= config.maxBufferHole;
      const waiting = bufferInfo.len > 0 && bufferInfo.len < 1 && media.readyState < 3;
      const gapLength = startTime - currentTime;
      if (gapLength > 0 && (bufferStarved || waiting)) {
        // Only allow large gaps to be skipped if it is a start gap, or all fragments in skip range are partial
        if (gapLength > config.maxBufferHole) {
          const {
            fragmentTracker
          } = this;
          let startGap = false;
          if (currentTime === 0) {
            const startFrag = fragmentTracker.getAppendedFrag(0, PlaylistLevelType.MAIN);
            if (startFrag && startTime < startFrag.end) {
              startGap = true;
            }
          }
          if (!startGap) {
            const startProvisioned = partial || fragmentTracker.getAppendedFrag(currentTime, PlaylistLevelType.MAIN);
            if (startProvisioned) {
              let moreToLoad = false;
              let pos = startProvisioned.end;
              while (pos < startTime) {
                const provisioned = fragmentTracker.getPartialFragment(pos);
                if (provisioned) {
                  pos += provisioned.duration;
                } else {
                  moreToLoad = true;
                  break;
                }
              }
              if (moreToLoad) {
                return 0;
              }
            }
          }
        }
        const targetTime = Math.max(startTime + SKIP_BUFFER_RANGE_START, currentTime + SKIP_BUFFER_HOLE_STEP_SECONDS);
        logger.warn(`skipping hole, adjusting currentTime from ${currentTime} to ${targetTime}`);
        this.moved = true;
        this.stalled = null;
        media.currentTime = targetTime;
        if (partial && !partial.gap) {
          const error = new Error(`fragment loaded with buffer holes, seeking from ${currentTime} to ${targetTime}`);
          hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
            fatal: false,
            error,
            reason: error.message,
            frag: partial
          });
        }
        return targetTime;
      }
    }
    return 0;
  }

  /**
   * Attempts to fix buffer stalls by advancing the mediaElement's current time by a small amount.
   * @private
   */
  _tryNudgeBuffer() {
    const {
      config,
      hls,
      media,
      nudgeRetry
    } = this;
    if (media === null) {
      return;
    }
    const currentTime = media.currentTime;
    this.nudgeRetry++;
    if (nudgeRetry < config.nudgeMaxRetry) {
      const targetTime = currentTime + (nudgeRetry + 1) * config.nudgeOffset;
      // playback stalled in buffered area ... let's nudge currentTime to try to overcome this
      const error = new Error(`Nudging 'currentTime' from ${currentTime} to ${targetTime}`);
      logger.warn(error.message);
      media.currentTime = targetTime;
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_NUDGE_ON_STALL,
        error,
        fatal: false
      });
    } else {
      const error = new Error(`Playhead still not moving while enough data buffered @${currentTime} after ${config.nudgeMaxRetry} nudges`);
      logger.error(error.message);
      hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_STALLED_ERROR,
        error,
        fatal: true
      });
    }
  }
}

const TICK_INTERVAL$2 = 100; // how often to tick in ms

class StreamController extends BaseStreamController {
  constructor(hls, fragmentTracker, keyLoader) {
    super(hls, fragmentTracker, keyLoader, '[stream-controller]', PlaylistLevelType.MAIN);
    this.audioCodecSwap = false;
    this.gapController = null;
    this.level = -1;
    this._forceStartLoad = false;
    this.altAudio = false;
    this.audioOnly = false;
    this.fragPlaying = null;
    this.onvplaying = null;
    this.onvseeked = null;
    this.fragLastKbps = 0;
    this.couldBacktrack = false;
    this.backtrackFragment = null;
    this.audioCodecSwitch = false;
    this.videoBuffer = null;
    this._registerListeners();
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
    hls.on(Events.ERROR, this.onError, this);
    hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.on(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
    hls.off(Events.ERROR, this.onError, this);
    hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.off(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }
  onHandlerDestroying() {
    this._unregisterListeners();
    this.onMediaDetaching();
  }
  startLoad(startPosition) {
    if (this.levels) {
      const {
        lastCurrentTime,
        hls
      } = this;
      this.stopLoad();
      this.setInterval(TICK_INTERVAL$2);
      this.level = -1;
      if (!this.startFragRequested) {
        // determine load level
        let startLevel = hls.startLevel;
        if (startLevel === -1) {
          if (hls.config.testBandwidth && this.levels.length > 1) {
            // -1 : guess start Level by doing a bitrate test by loading first fragment of lowest quality level
            startLevel = 0;
            this.bitrateTest = true;
          } else {
            startLevel = hls.nextAutoLevel;
          }
        }
        // set new level to playlist loader : this will trigger start level load
        // hls.nextLoadLevel remains until it is set to a new value or until a new frag is successfully loaded
        this.level = hls.nextLoadLevel = startLevel;
        this.loadedmetadata = false;
      }
      // if startPosition undefined but lastCurrentTime set, set startPosition to last currentTime
      if (lastCurrentTime > 0 && startPosition === -1) {
        this.log(`Override startPosition with lastCurrentTime @${lastCurrentTime.toFixed(3)}`);
        startPosition = lastCurrentTime;
      }
      this.state = State.IDLE;
      this.nextLoadPosition = this.startPosition = this.lastCurrentTime = startPosition;
      this.tick();
    } else {
      this._forceStartLoad = true;
      this.state = State.STOPPED;
    }
  }
  stopLoad() {
    this._forceStartLoad = false;
    super.stopLoad();
  }
  doTick() {
    switch (this.state) {
      case State.WAITING_LEVEL:
        {
          var _levels$level;
          const {
            levels,
            level
          } = this;
          const details = levels == null ? void 0 : (_levels$level = levels[level]) == null ? void 0 : _levels$level.details;
          if (details && (!details.live || this.levelLastLoaded === this.level)) {
            if (this.waitForCdnTuneIn(details)) {
              break;
            }
            this.state = State.IDLE;
            break;
          } else if (this.hls.nextLoadLevel !== this.level) {
            this.state = State.IDLE;
            break;
          }
          break;
        }
      case State.FRAG_LOADING_WAITING_RETRY:
        {
          var _this$media;
          const now = self.performance.now();
          const retryDate = this.retryDate;
          // if current time is gt than retryDate, or if media seeking let's switch to IDLE state to retry loading
          if (!retryDate || now >= retryDate || (_this$media = this.media) != null && _this$media.seeking) {
            this.resetStartWhenNotLoaded(this.level);
            this.state = State.IDLE;
          }
        }
        break;
    }
    if (this.state === State.IDLE) {
      this.doTickIdle();
    }
    this.onTickEnd();
  }
  onTickEnd() {
    super.onTickEnd();
    this.checkBuffer();
    this.checkFragmentChanged();
  }
  doTickIdle() {
    const {
      hls,
      levelLastLoaded,
      levels,
      media
    } = this;
    const {
      config,
      nextLoadLevel: level
    } = hls;

    // if start level not parsed yet OR
    // if video not attached AND start fragment already requested OR start frag prefetch not enabled
    // exit loop, as we either need more info (level not parsed) or we need media to be attached to load new fragment
    if (levelLastLoaded === null || !media && (this.startFragRequested || !config.startFragPrefetch)) {
      return;
    }

    // If the "main" level is audio-only but we are loading an alternate track in the same group, do not load anything
    if (this.altAudio && this.audioOnly) {
      return;
    }
    if (!(levels != null && levels[level])) {
      return;
    }
    const levelInfo = levels[level];

    // if buffer length is less than maxBufLen try to load a new fragment

    const bufferInfo = this.getMainFwdBufferInfo();
    if (bufferInfo === null) {
      return;
    }
    const lastDetails = this.getLevelDetails();
    if (lastDetails && this._streamEnded(bufferInfo, lastDetails)) {
      const data = {};
      if (this.altAudio) {
        data.type = 'video';
      }
      this.hls.trigger(Events.BUFFER_EOS, data);
      this.state = State.ENDED;
      return;
    }

    // set next load level : this will trigger a playlist load if needed
    if (hls.loadLevel !== level && hls.manualLevel === -1) {
      this.log(`Adapting to level ${level} from level ${this.level}`);
    }
    this.level = hls.nextLoadLevel = level;
    const levelDetails = levelInfo.details;
    // if level info not retrieved yet, switch state and wait for level retrieval
    // if live playlist, ensure that new playlist has been refreshed to avoid loading/try to load
    // a useless and outdated fragment (that might even introduce load error if it is already out of the live playlist)
    if (!levelDetails || this.state === State.WAITING_LEVEL || levelDetails.live && this.levelLastLoaded !== level) {
      this.level = level;
      this.state = State.WAITING_LEVEL;
      return;
    }
    const bufferLen = bufferInfo.len;

    // compute max Buffer Length that we could get from this load level, based on level bitrate. don't buffer more than 60 MB and more than 30s
    const maxBufLen = this.getMaxBufferLength(levelInfo.maxBitrate);

    // Stay idle if we are still with buffer margins
    if (bufferLen >= maxBufLen) {
      return;
    }
    if (this.backtrackFragment && this.backtrackFragment.start > bufferInfo.end) {
      this.backtrackFragment = null;
    }
    const targetBufferTime = this.backtrackFragment ? this.backtrackFragment.start : bufferInfo.end;
    let frag = this.getNextFragment(targetBufferTime, levelDetails);
    // Avoid backtracking by loading an earlier segment in streams with segments that do not start with a key frame (flagged by `couldBacktrack`)
    if (this.couldBacktrack && !this.fragPrevious && frag && frag.sn !== 'initSegment' && this.fragmentTracker.getState(frag) !== FragmentState.OK) {
      var _this$backtrackFragme;
      const backtrackSn = ((_this$backtrackFragme = this.backtrackFragment) != null ? _this$backtrackFragme : frag).sn;
      const fragIdx = backtrackSn - levelDetails.startSN;
      const backtrackFrag = levelDetails.fragments[fragIdx - 1];
      if (backtrackFrag && frag.cc === backtrackFrag.cc) {
        frag = backtrackFrag;
        this.fragmentTracker.removeFragment(backtrackFrag);
      }
    } else if (this.backtrackFragment && bufferInfo.len) {
      this.backtrackFragment = null;
    }
    // Avoid loop loading by using nextLoadPosition set for backtracking and skipping consecutive GAP tags
    if (frag && this.isLoopLoading(frag, targetBufferTime)) {
      const gapStart = frag.gap;
      if (!gapStart) {
        // Cleanup the fragment tracker before trying to find the next unbuffered fragment
        const type = this.audioOnly && !this.altAudio ? ElementaryStreamTypes.AUDIO : ElementaryStreamTypes.VIDEO;
        const mediaBuffer = (type === ElementaryStreamTypes.VIDEO ? this.videoBuffer : this.mediaBuffer) || this.media;
        if (mediaBuffer) {
          this.afterBufferFlushed(mediaBuffer, type, PlaylistLevelType.MAIN);
        }
      }
      frag = this.getNextFragmentLoopLoading(frag, levelDetails, bufferInfo, PlaylistLevelType.MAIN, maxBufLen);
    }
    if (!frag) {
      return;
    }
    if (frag.initSegment && !frag.initSegment.data && !this.bitrateTest) {
      frag = frag.initSegment;
    }
    this.loadFragment(frag, levelInfo, targetBufferTime);
  }
  loadFragment(frag, level, targetBufferTime) {
    // Check if fragment is not loaded
    const fragState = this.fragmentTracker.getState(frag);
    this.fragCurrent = frag;
    if (fragState === FragmentState.NOT_LOADED || fragState === FragmentState.PARTIAL) {
      if (frag.sn === 'initSegment') {
        this._loadInitSegment(frag, level);
      } else if (this.bitrateTest) {
        this.log(`Fragment ${frag.sn} of level ${frag.level} is being downloaded to test bitrate and will not be buffered`);
        this._loadBitrateTestFrag(frag, level);
      } else {
        this.startFragRequested = true;
        super.loadFragment(frag, level, targetBufferTime);
      }
    } else {
      this.clearTrackerIfNeeded(frag);
    }
  }
  getBufferedFrag(position) {
    return this.fragmentTracker.getBufferedFrag(position, PlaylistLevelType.MAIN);
  }
  followingBufferedFrag(frag) {
    if (frag) {
      // try to get range of next fragment (500ms after this range)
      return this.getBufferedFrag(frag.end + 0.5);
    }
    return null;
  }

  /*
    on immediate level switch :
     - pause playback if playing
     - cancel any pending load request
     - and trigger a buffer flush
  */
  immediateLevelSwitch() {
    this.abortCurrentFrag();
    this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
  }

  /**
   * try to switch ASAP without breaking video playback:
   * in order to ensure smooth but quick level switching,
   * we need to find the next flushable buffer range
   * we should take into account new segment fetch time
   */
  nextLevelSwitch() {
    const {
      levels,
      media
    } = this;
    // ensure that media is defined and that metadata are available (to retrieve currentTime)
    if (media != null && media.readyState) {
      let fetchdelay;
      const fragPlayingCurrent = this.getAppendedFrag(media.currentTime);
      if (fragPlayingCurrent && fragPlayingCurrent.start > 1) {
        // flush buffer preceding current fragment (flush until current fragment start offset)
        // minus 1s to avoid video freezing, that could happen if we flush keyframe of current video ...
        this.flushMainBuffer(0, fragPlayingCurrent.start - 1);
      }
      const levelDetails = this.getLevelDetails();
      if (levelDetails != null && levelDetails.live) {
        const bufferInfo = this.getMainFwdBufferInfo();
        // Do not flush in live stream with low buffer
        if (!bufferInfo || bufferInfo.len < levelDetails.targetduration * 2) {
          return;
        }
      }
      if (!media.paused && levels) {
        // add a safety delay of 1s
        const nextLevelId = this.hls.nextLoadLevel;
        const nextLevel = levels[nextLevelId];
        const fragLastKbps = this.fragLastKbps;
        if (fragLastKbps && this.fragCurrent) {
          fetchdelay = this.fragCurrent.duration * nextLevel.maxBitrate / (1000 * fragLastKbps) + 1;
        } else {
          fetchdelay = 0;
        }
      } else {
        fetchdelay = 0;
      }
      // this.log('fetchdelay:'+fetchdelay);
      // find buffer range that will be reached once new fragment will be fetched
      const bufferedFrag = this.getBufferedFrag(media.currentTime + fetchdelay);
      if (bufferedFrag) {
        // we can flush buffer range following this one without stalling playback
        const nextBufferedFrag = this.followingBufferedFrag(bufferedFrag);
        if (nextBufferedFrag) {
          // if we are here, we can also cancel any loading/demuxing in progress, as they are useless
          this.abortCurrentFrag();
          // start flush position is in next buffered frag. Leave some padding for non-independent segments and smoother playback.
          const maxStart = nextBufferedFrag.maxStartPTS ? nextBufferedFrag.maxStartPTS : nextBufferedFrag.start;
          const fragDuration = nextBufferedFrag.duration;
          const startPts = Math.max(bufferedFrag.end, maxStart + Math.min(Math.max(fragDuration - this.config.maxFragLookUpTolerance, fragDuration * 0.5), fragDuration * 0.75));
          this.flushMainBuffer(startPts, Number.POSITIVE_INFINITY);
        }
      }
    }
  }
  abortCurrentFrag() {
    const fragCurrent = this.fragCurrent;
    this.fragCurrent = null;
    this.backtrackFragment = null;
    if (fragCurrent) {
      fragCurrent.abortRequests();
      this.fragmentTracker.removeFragment(fragCurrent);
    }
    switch (this.state) {
      case State.KEY_LOADING:
      case State.FRAG_LOADING:
      case State.FRAG_LOADING_WAITING_RETRY:
      case State.PARSING:
      case State.PARSED:
        this.state = State.IDLE;
        break;
    }
    this.nextLoadPosition = this.getLoadPosition();
  }
  flushMainBuffer(startOffset, endOffset) {
    super.flushMainBuffer(startOffset, endOffset, this.altAudio ? 'video' : null);
  }
  onMediaAttached(event, data) {
    super.onMediaAttached(event, data);
    const media = data.media;
    this.onvplaying = this.onMediaPlaying.bind(this);
    this.onvseeked = this.onMediaSeeked.bind(this);
    media.addEventListener('playing', this.onvplaying);
    media.addEventListener('seeked', this.onvseeked);
    this.gapController = new GapController(this.config, media, this.fragmentTracker, this.hls);
  }
  onMediaDetaching() {
    const {
      media
    } = this;
    if (media && this.onvplaying && this.onvseeked) {
      media.removeEventListener('playing', this.onvplaying);
      media.removeEventListener('seeked', this.onvseeked);
      this.onvplaying = this.onvseeked = null;
      this.videoBuffer = null;
    }
    this.fragPlaying = null;
    if (this.gapController) {
      this.gapController.destroy();
      this.gapController = null;
    }
    super.onMediaDetaching();
  }
  onMediaPlaying() {
    // tick to speed up FRAG_CHANGED triggering
    this.tick();
  }
  onMediaSeeked() {
    const media = this.media;
    const currentTime = media ? media.currentTime : null;
    if (isFiniteNumber(currentTime)) {
      this.log(`Media seeked to ${currentTime.toFixed(3)}`);
    }

    // If seeked was issued before buffer was appended do not tick immediately
    const bufferInfo = this.getMainFwdBufferInfo();
    if (bufferInfo === null || bufferInfo.len === 0) {
      this.warn(`Main forward buffer length on "seeked" event ${bufferInfo ? bufferInfo.len : 'empty'})`);
      return;
    }

    // tick to speed up FRAG_CHANGED triggering
    this.tick();
  }
  onManifestLoading() {
    // reset buffer on manifest loading
    this.log('Trigger BUFFER_RESET');
    this.hls.trigger(Events.BUFFER_RESET, undefined);
    this.fragmentTracker.removeAllFragments();
    this.couldBacktrack = false;
    this.startPosition = this.lastCurrentTime = 0;
    this.levels = this.fragPlaying = this.backtrackFragment = null;
    this.altAudio = this.audioOnly = false;
  }
  onManifestParsed(event, data) {
    let aac = false;
    let heaac = false;
    let codec;
    data.levels.forEach(level => {
      // detect if we have different kind of audio codecs used amongst playlists
      codec = level.audioCodec;
      if (codec) {
        if (codec.indexOf('mp4a.40.2') !== -1) {
          aac = true;
        }
        if (codec.indexOf('mp4a.40.5') !== -1) {
          heaac = true;
        }
      }
    });
    this.audioCodecSwitch = aac && heaac && !changeTypeSupported();
    if (this.audioCodecSwitch) {
      this.log('Both AAC/HE-AAC audio found in levels; declaring level codec as HE-AAC');
    }
    this.levels = data.levels;
    this.startFragRequested = false;
  }
  onLevelLoading(event, data) {
    const {
      levels
    } = this;
    if (!levels || this.state !== State.IDLE) {
      return;
    }
    const level = levels[data.level];
    if (!level.details || level.details.live && this.levelLastLoaded !== data.level || this.waitForCdnTuneIn(level.details)) {
      this.state = State.WAITING_LEVEL;
    }
  }
  onLevelLoaded(event, data) {
    var _curLevel$details;
    const {
      levels
    } = this;
    const newLevelId = data.level;
    const newDetails = data.details;
    const duration = newDetails.totalduration;
    if (!levels) {
      this.warn(`Levels were reset while loading level ${newLevelId}`);
      return;
    }
    this.log(`Level ${newLevelId} loaded [${newDetails.startSN},${newDetails.endSN}]${newDetails.lastPartSn ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]` : ''}, cc [${newDetails.startCC}, ${newDetails.endCC}] duration:${duration}`);
    const curLevel = levels[newLevelId];
    const fragCurrent = this.fragCurrent;
    if (fragCurrent && (this.state === State.FRAG_LOADING || this.state === State.FRAG_LOADING_WAITING_RETRY)) {
      if ((fragCurrent.level !== data.level || fragCurrent.urlId !== curLevel.urlId) && fragCurrent.loader) {
        this.abortCurrentFrag();
      }
    }
    let sliding = 0;
    if (newDetails.live || (_curLevel$details = curLevel.details) != null && _curLevel$details.live) {
      this.checkLiveUpdate(newDetails);
      if (newDetails.deltaUpdateFailed) {
        return;
      }
      sliding = this.alignPlaylists(newDetails, curLevel.details);
    }
    // override level info
    curLevel.details = newDetails;
    this.levelLastLoaded = newLevelId;
    this.hls.trigger(Events.LEVEL_UPDATED, {
      details: newDetails,
      level: newLevelId
    });

    // only switch back to IDLE state if we were waiting for level to start downloading a new fragment
    if (this.state === State.WAITING_LEVEL) {
      if (this.waitForCdnTuneIn(newDetails)) {
        // Wait for Low-Latency CDN Tune-in
        return;
      }
      this.state = State.IDLE;
    }
    if (!this.startFragRequested) {
      this.setStartPosition(newDetails, sliding);
    } else if (newDetails.live) {
      this.synchronizeToLiveEdge(newDetails);
    }

    // trigger handler right now
    this.tick();
  }
  _handleFragmentLoadProgress(data) {
    var _frag$initSegment;
    const {
      frag,
      part,
      payload
    } = data;
    const {
      levels
    } = this;
    if (!levels) {
      this.warn(`Levels were reset while fragment load was in progress. Fragment ${frag.sn} of level ${frag.level} will not be buffered`);
      return;
    }
    const currentLevel = levels[frag.level];
    const details = currentLevel.details;
    if (!details) {
      this.warn(`Dropping fragment ${frag.sn} of level ${frag.level} after level details were reset`);
      this.fragmentTracker.removeFragment(frag);
      return;
    }
    const videoCodec = currentLevel.videoCodec;

    // time Offset is accurate if level PTS is known, or if playlist is not sliding (not live)
    const accurateTimeOffset = details.PTSKnown || !details.live;
    const initSegmentData = (_frag$initSegment = frag.initSegment) == null ? void 0 : _frag$initSegment.data;
    const audioCodec = this._getAudioCodec(currentLevel);

    // transmux the MPEG-TS data to ISO-BMFF segments
    // this.log(`Transmuxing ${frag.sn} of [${details.startSN} ,${details.endSN}],level ${frag.level}, cc ${frag.cc}`);
    const transmuxer = this.transmuxer = this.transmuxer || new TransmuxerInterface(this.hls, PlaylistLevelType.MAIN, this._handleTransmuxComplete.bind(this), this._handleTransmuxerFlush.bind(this));
    const partIndex = part ? part.index : -1;
    const partial = partIndex !== -1;
    const chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount, payload.byteLength, partIndex, partial);
    const initPTS = this.initPTS[frag.cc];
    transmuxer.push(payload, initSegmentData, audioCodec, videoCodec, frag, part, details.totalduration, accurateTimeOffset, chunkMeta, initPTS);
  }
  onAudioTrackSwitching(event, data) {
    // if any URL found on new audio track, it is an alternate audio track
    const fromAltAudio = this.altAudio;
    const altAudio = !!data.url;
    // if we switch on main audio, ensure that main fragment scheduling is synced with media.buffered
    // don't do anything if we switch to alt audio: audio stream controller is handling it.
    // we will just have to change buffer scheduling on audioTrackSwitched
    if (!altAudio) {
      if (this.mediaBuffer !== this.media) {
        this.log('Switching on main audio, use media.buffered to schedule main fragment loading');
        this.mediaBuffer = this.media;
        const fragCurrent = this.fragCurrent;
        // we need to refill audio buffer from main: cancel any frag loading to speed up audio switch
        if (fragCurrent) {
          this.log('Switching to main audio track, cancel main fragment load');
          fragCurrent.abortRequests();
          this.fragmentTracker.removeFragment(fragCurrent);
        }
        // destroy transmuxer to force init segment generation (following audio switch)
        this.resetTransmuxer();
        // switch to IDLE state to load new fragment
        this.resetLoadingState();
      } else if (this.audioOnly) {
        // Reset audio transmuxer so when switching back to main audio we're not still appending where we left off
        this.resetTransmuxer();
      }
      const hls = this.hls;
      // If switching from alt to main audio, flush all audio and trigger track switched
      if (fromAltAudio) {
        hls.trigger(Events.BUFFER_FLUSHING, {
          startOffset: 0,
          endOffset: Number.POSITIVE_INFINITY,
          type: null
        });
        this.fragmentTracker.removeAllFragments();
      }
      hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
    }
  }
  onAudioTrackSwitched(event, data) {
    const trackId = data.id;
    const altAudio = !!this.hls.audioTracks[trackId].url;
    if (altAudio) {
      const videoBuffer = this.videoBuffer;
      // if we switched on alternate audio, ensure that main fragment scheduling is synced with video sourcebuffer buffered
      if (videoBuffer && this.mediaBuffer !== videoBuffer) {
        this.log('Switching on alternate audio, use video.buffered to schedule main fragment loading');
        this.mediaBuffer = videoBuffer;
      }
    }
    this.altAudio = altAudio;
    this.tick();
  }
  onBufferCreated(event, data) {
    const tracks = data.tracks;
    let mediaTrack;
    let name;
    let alternate = false;
    for (const type in tracks) {
      const track = tracks[type];
      if (track.id === 'main') {
        name = type;
        mediaTrack = track;
        // keep video source buffer reference
        if (type === 'video') {
          const videoTrack = tracks[type];
          if (videoTrack) {
            this.videoBuffer = videoTrack.buffer;
          }
        }
      } else {
        alternate = true;
      }
    }
    if (alternate && mediaTrack) {
      this.log(`Alternate track found, use ${name}.buffered to schedule main fragment loading`);
      this.mediaBuffer = mediaTrack.buffer;
    } else {
      this.mediaBuffer = this.media;
    }
  }
  onFragBuffered(event, data) {
    const {
      frag,
      part
    } = data;
    if (frag && frag.type !== PlaylistLevelType.MAIN) {
      return;
    }
    if (this.fragContextChanged(frag)) {
      // If a level switch was requested while a fragment was buffering, it will emit the FRAG_BUFFERED event upon completion
      // Avoid setting state back to IDLE, since that will interfere with a level switch
      this.warn(`Fragment ${frag.sn}${part ? ' p: ' + part.index : ''} of level ${frag.level} finished buffering, but was aborted. state: ${this.state}`);
      if (this.state === State.PARSED) {
        this.state = State.IDLE;
      }
      return;
    }
    const stats = part ? part.stats : frag.stats;
    this.fragLastKbps = Math.round(8 * stats.total / (stats.buffering.end - stats.loading.first));
    if (frag.sn !== 'initSegment') {
      this.fragPrevious = frag;
    }
    this.fragBufferedComplete(frag, part);
  }
  onError(event, data) {
    var _data$context;
    if (data.fatal) {
      this.state = State.ERROR;
      return;
    }
    switch (data.details) {
      case ErrorDetails.FRAG_GAP:
      case ErrorDetails.FRAG_PARSING_ERROR:
      case ErrorDetails.FRAG_DECRYPT_ERROR:
      case ErrorDetails.FRAG_LOAD_ERROR:
      case ErrorDetails.FRAG_LOAD_TIMEOUT:
      case ErrorDetails.KEY_LOAD_ERROR:
      case ErrorDetails.KEY_LOAD_TIMEOUT:
        this.onFragmentOrKeyLoadError(PlaylistLevelType.MAIN, data);
        break;
      case ErrorDetails.LEVEL_LOAD_ERROR:
      case ErrorDetails.LEVEL_LOAD_TIMEOUT:
      case ErrorDetails.LEVEL_PARSING_ERROR:
        // in case of non fatal error while loading level, if level controller is not retrying to load level, switch back to IDLE
        if (!data.levelRetry && this.state === State.WAITING_LEVEL && ((_data$context = data.context) == null ? void 0 : _data$context.type) === PlaylistContextType.LEVEL) {
          this.state = State.IDLE;
        }
        break;
      case ErrorDetails.BUFFER_FULL_ERROR:
        if (!data.parent || data.parent !== 'main') {
          return;
        }
        if (this.reduceLengthAndFlushBuffer(data)) {
          this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
        }
        break;
      case ErrorDetails.INTERNAL_EXCEPTION:
        this.recoverWorkerError(data);
        break;
    }
  }

  // Checks the health of the buffer and attempts to resolve playback stalls.
  checkBuffer() {
    const {
      media,
      gapController
    } = this;
    if (!media || !gapController || !media.readyState) {
      // Exit early if we don't have media or if the media hasn't buffered anything yet (readyState 0)
      return;
    }
    if (this.loadedmetadata || !BufferHelper.getBuffered(media).length) {
      // Resolve gaps using the main buffer, whose ranges are the intersections of the A/V sourcebuffers
      const activeFrag = this.state !== State.IDLE ? this.fragCurrent : null;
      gapController.poll(this.lastCurrentTime, activeFrag);
    }
    this.lastCurrentTime = media.currentTime;
  }
  onFragLoadEmergencyAborted() {
    this.state = State.IDLE;
    // if loadedmetadata is not set, it means that we are emergency switch down on first frag
    // in that case, reset startFragRequested flag
    if (!this.loadedmetadata) {
      this.startFragRequested = false;
      this.nextLoadPosition = this.startPosition;
    }
    this.tickImmediate();
  }
  onBufferFlushed(event, {
    type
  }) {
    if (type !== ElementaryStreamTypes.AUDIO || this.audioOnly && !this.altAudio) {
      const mediaBuffer = (type === ElementaryStreamTypes.VIDEO ? this.videoBuffer : this.mediaBuffer) || this.media;
      this.afterBufferFlushed(mediaBuffer, type, PlaylistLevelType.MAIN);
    }
  }
  onLevelsUpdated(event, data) {
    this.levels = data.levels;
  }
  swapAudioCodec() {
    this.audioCodecSwap = !this.audioCodecSwap;
  }

  /**
   * Seeks to the set startPosition if not equal to the mediaElement's current time.
   */
  seekToStartPos() {
    const {
      media
    } = this;
    if (!media) {
      return;
    }
    const currentTime = media.currentTime;
    let startPosition = this.startPosition;
    // only adjust currentTime if different from startPosition or if startPosition not buffered
    // at that stage, there should be only one buffered range, as we reach that code after first fragment has been buffered
    if (startPosition >= 0 && currentTime < startPosition) {
      if (media.seeking) {
        this.log(`could not seek to ${startPosition}, already seeking at ${currentTime}`);
        return;
      }
      const buffered = BufferHelper.getBuffered(media);
      const bufferStart = buffered.length ? buffered.start(0) : 0;
      const delta = bufferStart - startPosition;
      if (delta > 0 && (delta < this.config.maxBufferHole || delta < this.config.maxFragLookUpTolerance)) {
        this.log(`adjusting start position by ${delta} to match buffer start`);
        startPosition += delta;
        this.startPosition = startPosition;
      }
      this.log(`seek to target start position ${startPosition} from current time ${currentTime}`);
      media.currentTime = startPosition;
    }
  }
  _getAudioCodec(currentLevel) {
    let audioCodec = this.config.defaultAudioCodec || currentLevel.audioCodec;
    if (this.audioCodecSwap && audioCodec) {
      this.log('Swapping audio codec');
      if (audioCodec.indexOf('mp4a.40.5') !== -1) {
        audioCodec = 'mp4a.40.2';
      } else {
        audioCodec = 'mp4a.40.5';
      }
    }
    return audioCodec;
  }
  _loadBitrateTestFrag(frag, level) {
    frag.bitrateTest = true;
    this._doFragLoad(frag, level).then(data => {
      const {
        hls
      } = this;
      if (!data || this.fragContextChanged(frag)) {
        return;
      }
      level.fragmentError = 0;
      this.state = State.IDLE;
      this.startFragRequested = false;
      this.bitrateTest = false;
      const stats = frag.stats;
      // Bitrate tests fragments are neither parsed nor buffered
      stats.parsing.start = stats.parsing.end = stats.buffering.start = stats.buffering.end = self.performance.now();
      hls.trigger(Events.FRAG_LOADED, data);
      frag.bitrateTest = false;
    });
  }
  _handleTransmuxComplete(transmuxResult) {
    var _id3$samples;
    const id = 'main';
    const {
      hls
    } = this;
    const {
      remuxResult,
      chunkMeta
    } = transmuxResult;
    const context = this.getCurrentContext(chunkMeta);
    if (!context) {
      this.resetWhenMissingContext(chunkMeta);
      return;
    }
    const {
      frag,
      part,
      level
    } = context;
    const {
      video,
      text,
      id3,
      initSegment
    } = remuxResult;
    const {
      details
    } = level;
    // The audio-stream-controller handles audio buffering if Hls.js is playing an alternate audio track
    const audio = this.altAudio ? undefined : remuxResult.audio;

    // Check if the current fragment has been aborted. We check this by first seeing if we're still playing the current level.
    // If we are, subsequently check if the currently loading fragment (fragCurrent) has changed.
    if (this.fragContextChanged(frag)) {
      this.fragmentTracker.removeFragment(frag);
      return;
    }
    this.state = State.PARSING;
    if (initSegment) {
      if (initSegment != null && initSegment.tracks) {
        const mapFragment = frag.initSegment || frag;
        this._bufferInitSegment(level, initSegment.tracks, mapFragment, chunkMeta);
        hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
          frag: mapFragment,
          id,
          tracks: initSegment.tracks
        });
      }

      // This would be nice if Number.isFinite acted as a typeguard, but it doesn't. See: https://github.com/Microsoft/TypeScript/issues/10038
      const initPTS = initSegment.initPTS;
      const timescale = initSegment.timescale;
      if (isFiniteNumber(initPTS)) {
        this.initPTS[frag.cc] = {
          baseTime: initPTS,
          timescale
        };
        hls.trigger(Events.INIT_PTS_FOUND, {
          frag,
          id,
          initPTS,
          timescale
        });
      }
    }

    // Avoid buffering if backtracking this fragment
    if (video && details && frag.sn !== 'initSegment') {
      const prevFrag = details.fragments[frag.sn - 1 - details.startSN];
      const isFirstFragment = frag.sn === details.startSN;
      const isFirstInDiscontinuity = !prevFrag || frag.cc > prevFrag.cc;
      if (remuxResult.independent !== false) {
        const {
          startPTS,
          endPTS,
          startDTS,
          endDTS
        } = video;
        if (part) {
          part.elementaryStreams[video.type] = {
            startPTS,
            endPTS,
            startDTS,
            endDTS
          };
        } else {
          if (video.firstKeyFrame && video.independent && chunkMeta.id === 1 && !isFirstInDiscontinuity) {
            this.couldBacktrack = true;
          }
          if (video.dropped && video.independent) {
            // Backtrack if dropped frames create a gap after currentTime

            const bufferInfo = this.getMainFwdBufferInfo();
            const targetBufferTime = (bufferInfo ? bufferInfo.end : this.getLoadPosition()) + this.config.maxBufferHole;
            const startTime = video.firstKeyFramePTS ? video.firstKeyFramePTS : startPTS;
            if (!isFirstFragment && targetBufferTime < startTime - this.config.maxBufferHole && !isFirstInDiscontinuity) {
              this.backtrack(frag);
              return;
            } else if (isFirstInDiscontinuity) {
              // Mark segment with a gap to avoid loop loading
              frag.gap = true;
            }
            // Set video stream start to fragment start so that truncated samples do not distort the timeline, and mark it partial
            frag.setElementaryStreamInfo(video.type, frag.start, endPTS, frag.start, endDTS, true);
          }
        }
        frag.setElementaryStreamInfo(video.type, startPTS, endPTS, startDTS, endDTS);
        if (this.backtrackFragment) {
          this.backtrackFragment = frag;
        }
        this.bufferFragmentData(video, frag, part, chunkMeta, isFirstFragment || isFirstInDiscontinuity);
      } else if (isFirstFragment || isFirstInDiscontinuity) {
        // Mark segment with a gap to avoid loop loading
        frag.gap = true;
      } else {
        this.backtrack(frag);
        return;
      }
    }
    if (audio) {
      const {
        startPTS,
        endPTS,
        startDTS,
        endDTS
      } = audio;
      if (part) {
        part.elementaryStreams[ElementaryStreamTypes.AUDIO] = {
          startPTS,
          endPTS,
          startDTS,
          endDTS
        };
      }
      frag.setElementaryStreamInfo(ElementaryStreamTypes.AUDIO, startPTS, endPTS, startDTS, endDTS);
      this.bufferFragmentData(audio, frag, part, chunkMeta);
    }
    if (details && id3 != null && (_id3$samples = id3.samples) != null && _id3$samples.length) {
      const emittedID3 = {
        id,
        frag,
        details,
        samples: id3.samples
      };
      hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
    }
    if (details && text) {
      const emittedText = {
        id,
        frag,
        details,
        samples: text.samples
      };
      hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
    }
  }
  _bufferInitSegment(currentLevel, tracks, frag, chunkMeta) {
    if (this.state !== State.PARSING) {
      return;
    }
    this.audioOnly = !!tracks.audio && !tracks.video;

    // if audio track is expected to come from audio stream controller, discard any coming from main
    if (this.altAudio && !this.audioOnly) {
      delete tracks.audio;
    }
    // include levelCodec in audio and video tracks
    const {
      audio,
      video,
      audiovideo
    } = tracks;
    if (audio) {
      let audioCodec = currentLevel.audioCodec;
      const ua = navigator.userAgent.toLowerCase();
      if (this.audioCodecSwitch) {
        if (audioCodec) {
          if (audioCodec.indexOf('mp4a.40.5') !== -1) {
            audioCodec = 'mp4a.40.2';
          } else {
            audioCodec = 'mp4a.40.5';
          }
        }
        // In the case that AAC and HE-AAC audio codecs are signalled in manifest,
        // force HE-AAC, as it seems that most browsers prefers it.
        // don't force HE-AAC if mono stream, or in Firefox
        if (audio.metadata.channelCount !== 1 && ua.indexOf('firefox') === -1) {
          audioCodec = 'mp4a.40.5';
        }
      }
      // HE-AAC is broken on Android, always signal audio codec as AAC even if variant manifest states otherwise
      if (ua.indexOf('android') !== -1 && audio.container !== 'audio/mpeg') {
        // Exclude mpeg audio
        audioCodec = 'mp4a.40.2';
        this.log(`Android: force audio codec to ${audioCodec}`);
      }
      if (currentLevel.audioCodec && currentLevel.audioCodec !== audioCodec) {
        this.log(`Swapping manifest audio codec "${currentLevel.audioCodec}" for "${audioCodec}"`);
      }
      audio.levelCodec = audioCodec;
      audio.id = 'main';
      this.log(`Init audio buffer, container:${audio.container}, codecs[selected/level/parsed]=[${audioCodec || ''}/${currentLevel.audioCodec || ''}/${audio.codec}]`);
    }
    if (video) {
      video.levelCodec = currentLevel.videoCodec;
      video.id = 'main';
      this.log(`Init video buffer, container:${video.container}, codecs[level/parsed]=[${currentLevel.videoCodec || ''}/${video.codec}]`);
    }
    if (audiovideo) {
      this.log(`Init audiovideo buffer, container:${audiovideo.container}, codecs[level/parsed]=[${currentLevel.attrs.CODECS || ''}/${audiovideo.codec}]`);
    }
    this.hls.trigger(Events.BUFFER_CODECS, tracks);
    // loop through tracks that are going to be provided to bufferController
    Object.keys(tracks).forEach(trackName => {
      const track = tracks[trackName];
      const initSegment = track.initSegment;
      if (initSegment != null && initSegment.byteLength) {
        this.hls.trigger(Events.BUFFER_APPENDING, {
          type: trackName,
          data: initSegment,
          frag,
          part: null,
          chunkMeta,
          parent: frag.type
        });
      }
    });
    // trigger handler right now
    this.tick();
  }
  getMainFwdBufferInfo() {
    return this.getFwdBufferInfo(this.mediaBuffer ? this.mediaBuffer : this.media, PlaylistLevelType.MAIN);
  }
  backtrack(frag) {
    this.couldBacktrack = true;
    // Causes findFragments to backtrack through fragments to find the keyframe
    this.backtrackFragment = frag;
    this.resetTransmuxer();
    this.flushBufferGap(frag);
    this.fragmentTracker.removeFragment(frag);
    this.fragPrevious = null;
    this.nextLoadPosition = frag.start;
    this.state = State.IDLE;
  }
  checkFragmentChanged() {
    const video = this.media;
    let fragPlayingCurrent = null;
    if (video && video.readyState > 1 && video.seeking === false) {
      const currentTime = video.currentTime;
      /* if video element is in seeked state, currentTime can only increase.
        (assuming that playback rate is positive ...)
        As sometimes currentTime jumps back to zero after a
        media decode error, check this, to avoid seeking back to
        wrong position after a media decode error
      */

      if (BufferHelper.isBuffered(video, currentTime)) {
        fragPlayingCurrent = this.getAppendedFrag(currentTime);
      } else if (BufferHelper.isBuffered(video, currentTime + 0.1)) {
        /* ensure that FRAG_CHANGED event is triggered at startup,
          when first video frame is displayed and playback is paused.
          add a tolerance of 100ms, in case current position is not buffered,
          check if current pos+100ms is buffered and use that buffer range
          for FRAG_CHANGED event reporting */
        fragPlayingCurrent = this.getAppendedFrag(currentTime + 0.1);
      }
      if (fragPlayingCurrent) {
        this.backtrackFragment = null;
        const fragPlaying = this.fragPlaying;
        const fragCurrentLevel = fragPlayingCurrent.level;
        if (!fragPlaying || fragPlayingCurrent.sn !== fragPlaying.sn || fragPlaying.level !== fragCurrentLevel || fragPlayingCurrent.urlId !== fragPlaying.urlId) {
          this.fragPlaying = fragPlayingCurrent;
          this.hls.trigger(Events.FRAG_CHANGED, {
            frag: fragPlayingCurrent
          });
          if (!fragPlaying || fragPlaying.level !== fragCurrentLevel) {
            this.hls.trigger(Events.LEVEL_SWITCHED, {
              level: fragCurrentLevel
            });
          }
        }
      }
    }
  }
  get nextLevel() {
    const frag = this.nextBufferedFrag;
    if (frag) {
      return frag.level;
    }
    return -1;
  }
  get currentFrag() {
    const media = this.media;
    if (media) {
      return this.fragPlaying || this.getAppendedFrag(media.currentTime);
    }
    return null;
  }
  get currentProgramDateTime() {
    const media = this.media;
    if (media) {
      const currentTime = media.currentTime;
      const frag = this.currentFrag;
      if (frag && isFiniteNumber(currentTime) && isFiniteNumber(frag.programDateTime)) {
        const epocMs = frag.programDateTime + (currentTime - frag.start) * 1000;
        return new Date(epocMs);
      }
    }
    return null;
  }
  get currentLevel() {
    const frag = this.currentFrag;
    if (frag) {
      return frag.level;
    }
    return -1;
  }
  get nextBufferedFrag() {
    const frag = this.currentFrag;
    if (frag) {
      return this.followingBufferedFrag(frag);
    }
    return null;
  }
  get forceStartLoad() {
    return this._forceStartLoad;
  }
}

/*
 * compute an Exponential Weighted moving average
 * - https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
 *  - heavily inspired from shaka-player
 */

class EWMA {
  //  About half of the estimated value will be from the last |halfLife| samples by weight.
  constructor(halfLife, estimate = 0, weight = 0) {
    this.halfLife = void 0;
    this.alpha_ = void 0;
    this.estimate_ = void 0;
    this.totalWeight_ = void 0;
    this.halfLife = halfLife;
    // Larger values of alpha expire historical data more slowly.
    this.alpha_ = halfLife ? Math.exp(Math.log(0.5) / halfLife) : 0;
    this.estimate_ = estimate;
    this.totalWeight_ = weight;
  }
  sample(weight, value) {
    const adjAlpha = Math.pow(this.alpha_, weight);
    this.estimate_ = value * (1 - adjAlpha) + adjAlpha * this.estimate_;
    this.totalWeight_ += weight;
  }
  getTotalWeight() {
    return this.totalWeight_;
  }
  getEstimate() {
    if (this.alpha_) {
      const zeroFactor = 1 - Math.pow(this.alpha_, this.totalWeight_);
      if (zeroFactor) {
        return this.estimate_ / zeroFactor;
      }
    }
    return this.estimate_;
  }
}

/*
 * EWMA Bandwidth Estimator
 *  - heavily inspired from shaka-player
 * Tracks bandwidth samples and estimates available bandwidth.
 * Based on the minimum of two exponentially-weighted moving averages with
 * different half-lives.
 */

class EwmaBandWidthEstimator {
  constructor(slow, fast, defaultEstimate, defaultTTFB = 100) {
    this.defaultEstimate_ = void 0;
    this.minWeight_ = void 0;
    this.minDelayMs_ = void 0;
    this.slow_ = void 0;
    this.fast_ = void 0;
    this.defaultTTFB_ = void 0;
    this.ttfb_ = void 0;
    this.defaultEstimate_ = defaultEstimate;
    this.minWeight_ = 0.001;
    this.minDelayMs_ = 50;
    this.slow_ = new EWMA(slow);
    this.fast_ = new EWMA(fast);
    this.defaultTTFB_ = defaultTTFB;
    this.ttfb_ = new EWMA(slow);
  }
  update(slow, fast) {
    const {
      slow_,
      fast_,
      ttfb_
    } = this;
    if (slow_.halfLife !== slow) {
      this.slow_ = new EWMA(slow, slow_.getEstimate(), slow_.getTotalWeight());
    }
    if (fast_.halfLife !== fast) {
      this.fast_ = new EWMA(fast, fast_.getEstimate(), fast_.getTotalWeight());
    }
    if (ttfb_.halfLife !== slow) {
      this.ttfb_ = new EWMA(slow, ttfb_.getEstimate(), ttfb_.getTotalWeight());
    }
  }
  sample(durationMs, numBytes) {
    durationMs = Math.max(durationMs, this.minDelayMs_);
    const numBits = 8 * numBytes;
    // weight is duration in seconds
    const durationS = durationMs / 1000;
    // value is bandwidth in bits/s
    const bandwidthInBps = numBits / durationS;
    this.fast_.sample(durationS, bandwidthInBps);
    this.slow_.sample(durationS, bandwidthInBps);
  }
  sampleTTFB(ttfb) {
    // weight is frequency curve applied to TTFB in seconds
    // (longer times have less weight with expected input under 1 second)
    const seconds = ttfb / 1000;
    const weight = Math.sqrt(2) * Math.exp(-Math.pow(seconds, 2) / 2);
    this.ttfb_.sample(weight, Math.max(ttfb, 5));
  }
  canEstimate() {
    return this.fast_.getTotalWeight() >= this.minWeight_;
  }
  getEstimate() {
    if (this.canEstimate()) {
      // console.log('slow estimate:'+ Math.round(this.slow_.getEstimate()));
      // console.log('fast estimate:'+ Math.round(this.fast_.getEstimate()));
      // Take the minimum of these two estimates.  This should have the effect of
      // adapting down quickly, but up more slowly.
      return Math.min(this.fast_.getEstimate(), this.slow_.getEstimate());
    } else {
      return this.defaultEstimate_;
    }
  }
  getEstimateTTFB() {
    if (this.ttfb_.getTotalWeight() >= this.minWeight_) {
      return this.ttfb_.getEstimate();
    } else {
      return this.defaultTTFB_;
    }
  }
  destroy() {}
}

class AbrController {
  constructor(hls) {
    this.hls = void 0;
    this.lastLevelLoadSec = 0;
    this.lastLoadedFragLevel = 0;
    this._nextAutoLevel = -1;
    this.timer = -1;
    this.onCheck = this._abandonRulesCheck.bind(this);
    this.fragCurrent = null;
    this.partCurrent = null;
    this.bitrateTestDelay = 0;
    this.bwEstimator = void 0;
    this.hls = hls;
    const config = hls.config;
    this.bwEstimator = new EwmaBandWidthEstimator(config.abrEwmaSlowVoD, config.abrEwmaFastVoD, config.abrEwmaDefaultEstimate);
    this.registerListeners();
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
  }
  unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
  }
  destroy() {
    this.unregisterListeners();
    this.clearTimer();
    // @ts-ignore
    this.hls = this.onCheck = null;
    this.fragCurrent = this.partCurrent = null;
  }
  onFragLoading(event, data) {
    var _data$part;
    const frag = data.frag;
    if (this.ignoreFragment(frag)) {
      return;
    }
    this.fragCurrent = frag;
    this.partCurrent = (_data$part = data.part) != null ? _data$part : null;
    this.clearTimer();
    this.timer = self.setInterval(this.onCheck, 100);
  }
  onLevelSwitching(event, data) {
    this.clearTimer();
  }
  getTimeToLoadFrag(timeToFirstByteSec, bandwidth, fragSizeBits, isSwitch) {
    const fragLoadSec = timeToFirstByteSec + fragSizeBits / bandwidth;
    const playlistLoadSec = isSwitch ? this.lastLevelLoadSec : 0;
    return fragLoadSec + playlistLoadSec;
  }
  onLevelLoaded(event, data) {
    const config = this.hls.config;
    const {
      total,
      bwEstimate
    } = data.stats;
    // Total is the bytelength and bwEstimate in bits/sec
    if (isFiniteNumber(total) && isFiniteNumber(bwEstimate)) {
      this.lastLevelLoadSec = 8 * total / bwEstimate;
    }
    if (data.details.live) {
      this.bwEstimator.update(config.abrEwmaSlowLive, config.abrEwmaFastLive);
    } else {
      this.bwEstimator.update(config.abrEwmaSlowVoD, config.abrEwmaFastVoD);
    }
  }

  /*
      This method monitors the download rate of the current fragment, and will downswitch if that fragment will not load
      quickly enough to prevent underbuffering
    */
  _abandonRulesCheck() {
    const {
      fragCurrent: frag,
      partCurrent: part,
      hls
    } = this;
    const {
      autoLevelEnabled,
      media
    } = hls;
    if (!frag || !media) {
      return;
    }
    const now = performance.now();
    const stats = part ? part.stats : frag.stats;
    const duration = part ? part.duration : frag.duration;
    const timeLoading = now - stats.loading.start;
    // If frag loading is aborted, complete, or from lowest level, stop timer and return
    if (stats.aborted || stats.loaded && stats.loaded === stats.total || frag.level === 0) {
      this.clearTimer();
      // reset forced auto level value so that next level will be selected
      this._nextAutoLevel = -1;
      return;
    }

    // This check only runs if we're in ABR mode and actually playing
    if (!autoLevelEnabled || media.paused || !media.playbackRate || !media.readyState) {
      return;
    }
    const bufferInfo = hls.mainForwardBufferInfo;
    if (bufferInfo === null) {
      return;
    }
    const ttfbEstimate = this.bwEstimator.getEstimateTTFB();
    const playbackRate = Math.abs(media.playbackRate);
    // To maintain stable adaptive playback, only begin monitoring frag loading after half or more of its playback duration has passed
    if (timeLoading <= Math.max(ttfbEstimate, 1000 * (duration / (playbackRate * 2)))) {
      return;
    }

    // bufferStarvationDelay is an estimate of the amount time (in seconds) it will take to exhaust the buffer
    const bufferStarvationDelay = bufferInfo.len / playbackRate;
    // Only downswitch if less than 2 fragment lengths are buffered
    if (bufferStarvationDelay >= 2 * duration / playbackRate) {
      return;
    }
    const ttfb = stats.loading.first ? stats.loading.first - stats.loading.start : -1;
    const loadedFirstByte = stats.loaded && ttfb > -1;
    const bwEstimate = this.bwEstimator.getEstimate();
    const {
      levels,
      minAutoLevel
    } = hls;
    const level = levels[frag.level];
    const expectedLen = stats.total || Math.max(stats.loaded, Math.round(duration * level.maxBitrate / 8));
    let timeStreaming = timeLoading - ttfb;
    if (timeStreaming < 1 && loadedFirstByte) {
      timeStreaming = Math.min(timeLoading, stats.loaded * 8 / bwEstimate);
    }
    const loadRate = loadedFirstByte ? stats.loaded * 1000 / timeStreaming : 0;
    // fragLoadDelay is an estimate of the time (in seconds) it will take to buffer the remainder of the fragment
    const fragLoadedDelay = loadRate ? (expectedLen - stats.loaded) / loadRate : expectedLen * 8 / bwEstimate + ttfbEstimate / 1000;
    // Only downswitch if the time to finish loading the current fragment is greater than the amount of buffer left
    if (fragLoadedDelay <= bufferStarvationDelay) {
      return;
    }
    const bwe = loadRate ? loadRate * 8 : bwEstimate;
    let fragLevelNextLoadedDelay = Number.POSITIVE_INFINITY;
    let nextLoadLevel;
    // Iterate through lower level and try to find the largest one that avoids rebuffering
    for (nextLoadLevel = frag.level - 1; nextLoadLevel > minAutoLevel; nextLoadLevel--) {
      // compute time to load next fragment at lower level
      // 8 = bits per byte (bps/Bps)
      const levelNextBitrate = levels[nextLoadLevel].maxBitrate;
      fragLevelNextLoadedDelay = this.getTimeToLoadFrag(ttfbEstimate / 1000, bwe, duration * levelNextBitrate, !levels[nextLoadLevel].details);
      if (fragLevelNextLoadedDelay < bufferStarvationDelay) {
        break;
      }
    }
    // Only emergency switch down if it takes less time to load a new fragment at lowest level instead of continuing
    // to load the current one
    if (fragLevelNextLoadedDelay >= fragLoadedDelay) {
      return;
    }

    // if estimated load time of new segment is completely unreasonable, ignore and do not emergency switch down
    if (fragLevelNextLoadedDelay > duration * 10) {
      return;
    }
    hls.nextLoadLevel = nextLoadLevel;
    if (loadedFirstByte) {
      // If there has been loading progress, sample bandwidth using loading time offset by minimum TTFB time
      this.bwEstimator.sample(timeLoading - Math.min(ttfbEstimate, ttfb), stats.loaded);
    } else {
      // If there has been no loading progress, sample TTFB
      this.bwEstimator.sampleTTFB(timeLoading);
    }
    this.clearTimer();
    logger.warn(`[abr] Fragment ${frag.sn}${part ? ' part ' + part.index : ''} of level ${frag.level} is loading too slowly;
      Time to underbuffer: ${bufferStarvationDelay.toFixed(3)} s
      Estimated load time for current fragment: ${fragLoadedDelay.toFixed(3)} s
      Estimated load time for down switch fragment: ${fragLevelNextLoadedDelay.toFixed(3)} s
      TTFB estimate: ${ttfb}
      Current BW estimate: ${isFiniteNumber(bwEstimate) ? (bwEstimate / 1024).toFixed(3) : 'Unknown'} Kb/s
      New BW estimate: ${(this.bwEstimator.getEstimate() / 1024).toFixed(3)} Kb/s
      Aborting and switching to level ${nextLoadLevel}`);
    if (frag.loader) {
      this.fragCurrent = this.partCurrent = null;
      frag.abortRequests();
    }
    hls.trigger(Events.FRAG_LOAD_EMERGENCY_ABORTED, {
      frag,
      part,
      stats
    });
  }
  onFragLoaded(event, {
    frag,
    part
  }) {
    const stats = part ? part.stats : frag.stats;
    if (frag.type === PlaylistLevelType.MAIN) {
      this.bwEstimator.sampleTTFB(stats.loading.first - stats.loading.start);
    }
    if (this.ignoreFragment(frag)) {
      return;
    }
    // stop monitoring bw once frag loaded
    this.clearTimer();
    // store level id after successful fragment load
    this.lastLoadedFragLevel = frag.level;
    // reset forced auto level value so that next level will be selected
    this._nextAutoLevel = -1;

    // compute level average bitrate
    if (this.hls.config.abrMaxWithRealBitrate) {
      const duration = part ? part.duration : frag.duration;
      const level = this.hls.levels[frag.level];
      const loadedBytes = (level.loaded ? level.loaded.bytes : 0) + stats.loaded;
      const loadedDuration = (level.loaded ? level.loaded.duration : 0) + duration;
      level.loaded = {
        bytes: loadedBytes,
        duration: loadedDuration
      };
      level.realBitrate = Math.round(8 * loadedBytes / loadedDuration);
    }
    if (frag.bitrateTest) {
      const fragBufferedData = {
        stats,
        frag,
        part,
        id: frag.type
      };
      this.onFragBuffered(Events.FRAG_BUFFERED, fragBufferedData);
      frag.bitrateTest = false;
    }
  }
  onFragBuffered(event, data) {
    const {
      frag,
      part
    } = data;
    const stats = part != null && part.stats.loaded ? part.stats : frag.stats;
    if (stats.aborted) {
      return;
    }
    if (this.ignoreFragment(frag)) {
      return;
    }
    // Use the difference between parsing and request instead of buffering and request to compute fragLoadingProcessing;
    // rationale is that buffer appending only happens once media is attached. This can happen when config.startFragPrefetch
    // is used. If we used buffering in that case, our BW estimate sample will be very large.
    const processingMs = stats.parsing.end - stats.loading.start - Math.min(stats.loading.first - stats.loading.start, this.bwEstimator.getEstimateTTFB());
    this.bwEstimator.sample(processingMs, stats.loaded);
    stats.bwEstimate = this.bwEstimator.getEstimate();
    if (frag.bitrateTest) {
      this.bitrateTestDelay = processingMs / 1000;
    } else {
      this.bitrateTestDelay = 0;
    }
  }
  ignoreFragment(frag) {
    // Only count non-alt-audio frags which were actually buffered in our BW calculations
    return frag.type !== PlaylistLevelType.MAIN || frag.sn === 'initSegment';
  }
  clearTimer() {
    self.clearInterval(this.timer);
  }

  // return next auto level
  get nextAutoLevel() {
    const forcedAutoLevel = this._nextAutoLevel;
    const bwEstimator = this.bwEstimator;
    // in case next auto level has been forced, and bw not available or not reliable, return forced value
    if (forcedAutoLevel !== -1 && !bwEstimator.canEstimate()) {
      return forcedAutoLevel;
    }

    // compute next level using ABR logic
    let nextABRAutoLevel = this.getNextABRAutoLevel();
    // use forced auto level when ABR selected level has errored
    if (forcedAutoLevel !== -1) {
      const levels = this.hls.levels;
      if (levels.length > Math.max(forcedAutoLevel, nextABRAutoLevel) && levels[forcedAutoLevel].loadError <= levels[nextABRAutoLevel].loadError) {
        return forcedAutoLevel;
      }
    }
    // if forced auto level has been defined, use it to cap ABR computed quality level
    if (forcedAutoLevel !== -1) {
      nextABRAutoLevel = Math.min(forcedAutoLevel, nextABRAutoLevel);
    }
    return nextABRAutoLevel;
  }
  getNextABRAutoLevel() {
    const {
      fragCurrent,
      partCurrent,
      hls
    } = this;
    const {
      maxAutoLevel,
      config,
      minAutoLevel,
      media
    } = hls;
    const currentFragDuration = partCurrent ? partCurrent.duration : fragCurrent ? fragCurrent.duration : 0;

    // playbackRate is the absolute value of the playback rate; if media.playbackRate is 0, we use 1 to load as
    // if we're playing back at the normal rate.
    const playbackRate = media && media.playbackRate !== 0 ? Math.abs(media.playbackRate) : 1.0;
    const avgbw = this.bwEstimator ? this.bwEstimator.getEstimate() : config.abrEwmaDefaultEstimate;
    // bufferStarvationDelay is the wall-clock time left until the playback buffer is exhausted.
    const bufferInfo = hls.mainForwardBufferInfo;
    const bufferStarvationDelay = (bufferInfo ? bufferInfo.len : 0) / playbackRate;

    // First, look to see if we can find a level matching with our avg bandwidth AND that could also guarantee no rebuffering at all
    let bestLevel = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, config.abrBandWidthFactor, config.abrBandWidthUpFactor);
    if (bestLevel >= 0) {
      return bestLevel;
    }
    logger.trace(`[abr] ${bufferStarvationDelay ? 'rebuffering expected' : 'buffer is empty'}, finding optimal quality level`);
    // not possible to get rid of rebuffering ... let's try to find level that will guarantee less than maxStarvationDelay of rebuffering
    // if no matching level found, logic will return 0
    let maxStarvationDelay = currentFragDuration ? Math.min(currentFragDuration, config.maxStarvationDelay) : config.maxStarvationDelay;
    let bwFactor = config.abrBandWidthFactor;
    let bwUpFactor = config.abrBandWidthUpFactor;
    if (!bufferStarvationDelay) {
      // in case buffer is empty, let's check if previous fragment was loaded to perform a bitrate test
      const bitrateTestDelay = this.bitrateTestDelay;
      if (bitrateTestDelay) {
        // if it is the case, then we need to adjust our max starvation delay using maxLoadingDelay config value
        // max video loading delay used in  automatic start level selection :
        // in that mode ABR controller will ensure that video loading time (ie the time to fetch the first fragment at lowest quality level +
        // the time to fetch the fragment at the appropriate quality level is less than ```maxLoadingDelay``` )
        // cap maxLoadingDelay and ensure it is not bigger 'than bitrate test' frag duration
        const maxLoadingDelay = currentFragDuration ? Math.min(currentFragDuration, config.maxLoadingDelay) : config.maxLoadingDelay;
        maxStarvationDelay = maxLoadingDelay - bitrateTestDelay;
        logger.trace(`[abr] bitrate test took ${Math.round(1000 * bitrateTestDelay)}ms, set first fragment max fetchDuration to ${Math.round(1000 * maxStarvationDelay)} ms`);
        // don't use conservative factor on bitrate test
        bwFactor = bwUpFactor = 1;
      }
    }
    bestLevel = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay + maxStarvationDelay, bwFactor, bwUpFactor);
    return Math.max(bestLevel, 0);
  }
  findBestLevel(currentBw, minAutoLevel, maxAutoLevel, maxFetchDuration, bwFactor, bwUpFactor) {
    var _level$details;
    const {
      fragCurrent,
      partCurrent,
      lastLoadedFragLevel: currentLevel
    } = this;
    const {
      levels
    } = this.hls;
    const level = levels[currentLevel];
    const live = !!(level != null && (_level$details = level.details) != null && _level$details.live);
    const currentCodecSet = level == null ? void 0 : level.codecSet;
    const currentFragDuration = partCurrent ? partCurrent.duration : fragCurrent ? fragCurrent.duration : 0;
    const ttfbEstimateSec = this.bwEstimator.getEstimateTTFB() / 1000;
    let levelSkippedMin = minAutoLevel;
    let levelSkippedMax = -1;
    for (let i = maxAutoLevel; i >= minAutoLevel; i--) {
      const levelInfo = levels[i];
      if (!levelInfo || currentCodecSet && levelInfo.codecSet !== currentCodecSet) {
        if (levelInfo) {
          levelSkippedMin = Math.min(i, levelSkippedMin);
          levelSkippedMax = Math.max(i, levelSkippedMax);
        }
        continue;
      }
      if (levelSkippedMax !== -1) {
        logger.trace(`[abr] Skipped level(s) ${levelSkippedMin}-${levelSkippedMax} with CODECS:"${levels[levelSkippedMax].attrs.CODECS}"; not compatible with "${level.attrs.CODECS}"`);
      }
      const levelDetails = levelInfo.details;
      const avgDuration = (partCurrent ? levelDetails == null ? void 0 : levelDetails.partTarget : levelDetails == null ? void 0 : levelDetails.averagetargetduration) || currentFragDuration;
      let adjustedbw;
      // follow algorithm captured from stagefright :
      // https://android.googlesource.com/platform/frameworks/av/+/master/media/libstagefright/httplive/LiveSession.cpp
      // Pick the highest bandwidth stream below or equal to estimated bandwidth.
      // consider only 80% of the available bandwidth, but if we are switching up,
      // be even more conservative (70%) to avoid overestimating and immediately
      // switching back.
      if (i <= currentLevel) {
        adjustedbw = bwFactor * currentBw;
      } else {
        adjustedbw = bwUpFactor * currentBw;
      }
      const bitrate = levels[i].maxBitrate;
      const fetchDuration = this.getTimeToLoadFrag(ttfbEstimateSec, adjustedbw, bitrate * avgDuration, levelDetails === undefined);
      logger.trace(`[abr] level:${i} adjustedbw-bitrate:${Math.round(adjustedbw - bitrate)} avgDuration:${avgDuration.toFixed(1)} maxFetchDuration:${maxFetchDuration.toFixed(1)} fetchDuration:${fetchDuration.toFixed(1)}`);
      // if adjusted bw is greater than level bitrate AND
      if (adjustedbw > bitrate && (
      // fragment fetchDuration unknown OR live stream OR fragment fetchDuration less than max allowed fetch duration, then this level matches
      // we don't account for max Fetch Duration for live streams, this is to avoid switching down when near the edge of live sliding window ...
      // special case to support startLevel = -1 (bitrateTest) on live streams : in that case we should not exit loop so that findBestLevel will return -1
      fetchDuration === 0 || !isFiniteNumber(fetchDuration) || live && !this.bitrateTestDelay || fetchDuration < maxFetchDuration)) {
        // as we are looping from highest to lowest, this will return the best achievable quality level
        return i;
      }
    }
    // not enough time budget even with quality level 0 ... rebuffering might happen
    return -1;
  }
  set nextAutoLevel(nextLevel) {
    this._nextAutoLevel = nextLevel;
  }
}

class ChunkCache {
  constructor() {
    this.chunks = [];
    this.dataLength = 0;
  }
  push(chunk) {
    this.chunks.push(chunk);
    this.dataLength += chunk.length;
  }
  flush() {
    const {
      chunks,
      dataLength
    } = this;
    let result;
    if (!chunks.length) {
      return new Uint8Array(0);
    } else if (chunks.length === 1) {
      result = chunks[0];
    } else {
      result = concatUint8Arrays(chunks, dataLength);
    }
    this.reset();
    return result;
  }
  reset() {
    this.chunks.length = 0;
    this.dataLength = 0;
  }
}
function concatUint8Arrays(chunks, dataLength) {
  const result = new Uint8Array(dataLength);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const TICK_INTERVAL$1 = 100; // how often to tick in ms

class AudioStreamController extends BaseStreamController {
  constructor(hls, fragmentTracker, keyLoader) {
    super(hls, fragmentTracker, keyLoader, '[audio-stream-controller]', PlaylistLevelType.AUDIO);
    this.videoBuffer = null;
    this.videoTrackCC = -1;
    this.waitingVideoCC = -1;
    this.bufferedTrack = null;
    this.switchingTrack = null;
    this.trackId = -1;
    this.waitingData = null;
    this.mainDetails = null;
    this.bufferFlushed = false;
    this.cachedTrackLoadedData = null;
    this._registerListeners();
  }
  onHandlerDestroying() {
    this._unregisterListeners();
    this.mainDetails = null;
    this.bufferedTrack = null;
    this.switchingTrack = null;
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.AUDIO_TRACKS_UPDATED, this.onAudioTracksUpdated, this);
    hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.on(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
    hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.on(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.AUDIO_TRACKS_UPDATED, this.onAudioTracksUpdated, this);
    hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.off(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
    hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.off(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }

  // INIT_PTS_FOUND is triggered when the video track parsed in the stream-controller has a new PTS value
  onInitPtsFound(event, {
    frag,
    id,
    initPTS,
    timescale
  }) {
    // Always update the new INIT PTS
    // Can change due level switch
    if (id === 'main') {
      const cc = frag.cc;
      this.initPTS[frag.cc] = {
        baseTime: initPTS,
        timescale
      };
      this.log(`InitPTS for cc: ${cc} found from main: ${initPTS}`);
      this.videoTrackCC = cc;
      // If we are waiting, tick immediately to unblock audio fragment transmuxing
      if (this.state === State.WAITING_INIT_PTS) {
        this.tick();
      }
    }
  }
  startLoad(startPosition) {
    if (!this.levels) {
      this.startPosition = startPosition;
      this.state = State.STOPPED;
      return;
    }
    const lastCurrentTime = this.lastCurrentTime;
    this.stopLoad();
    this.setInterval(TICK_INTERVAL$1);
    if (lastCurrentTime > 0 && startPosition === -1) {
      this.log(`Override startPosition with lastCurrentTime @${lastCurrentTime.toFixed(3)}`);
      startPosition = lastCurrentTime;
      this.state = State.IDLE;
    } else {
      this.loadedmetadata = false;
      this.state = State.WAITING_TRACK;
    }
    this.nextLoadPosition = this.startPosition = this.lastCurrentTime = startPosition;
    this.tick();
  }
  doTick() {
    switch (this.state) {
      case State.IDLE:
        this.doTickIdle();
        break;
      case State.WAITING_TRACK:
        {
          var _levels$trackId;
          const {
            levels,
            trackId
          } = this;
          const details = levels == null ? void 0 : (_levels$trackId = levels[trackId]) == null ? void 0 : _levels$trackId.details;
          if (details) {
            if (this.waitForCdnTuneIn(details)) {
              break;
            }
            this.state = State.WAITING_INIT_PTS;
          }
          break;
        }
      case State.FRAG_LOADING_WAITING_RETRY:
        {
          var _this$media;
          const now = performance.now();
          const retryDate = this.retryDate;
          // if current time is gt than retryDate, or if media seeking let's switch to IDLE state to retry loading
          if (!retryDate || now >= retryDate || (_this$media = this.media) != null && _this$media.seeking) {
            this.log('RetryDate reached, switch back to IDLE state');
            this.resetStartWhenNotLoaded(this.trackId);
            this.state = State.IDLE;
          }
          break;
        }
      case State.WAITING_INIT_PTS:
        {
          // Ensure we don't get stuck in the WAITING_INIT_PTS state if the waiting frag CC doesn't match any initPTS
          const waitingData = this.waitingData;
          if (waitingData) {
            const {
              frag,
              part,
              cache,
              complete
            } = waitingData;
            if (this.initPTS[frag.cc] !== undefined) {
              this.waitingData = null;
              this.waitingVideoCC = -1;
              this.state = State.FRAG_LOADING;
              const payload = cache.flush();
              const data = {
                frag,
                part,
                payload,
                networkDetails: null
              };
              this._handleFragmentLoadProgress(data);
              if (complete) {
                super._handleFragmentLoadComplete(data);
              }
            } else if (this.videoTrackCC !== this.waitingVideoCC) {
              // Drop waiting fragment if videoTrackCC has changed since waitingFragment was set and initPTS was not found
              this.log(`Waiting fragment cc (${frag.cc}) cancelled because video is at cc ${this.videoTrackCC}`);
              this.clearWaitingFragment();
            } else {
              // Drop waiting fragment if an earlier fragment is needed
              const pos = this.getLoadPosition();
              const bufferInfo = BufferHelper.bufferInfo(this.mediaBuffer, pos, this.config.maxBufferHole);
              const waitingFragmentAtPosition = fragmentWithinToleranceTest(bufferInfo.end, this.config.maxFragLookUpTolerance, frag);
              if (waitingFragmentAtPosition < 0) {
                this.log(`Waiting fragment cc (${frag.cc}) @ ${frag.start} cancelled because another fragment at ${bufferInfo.end} is needed`);
                this.clearWaitingFragment();
              }
            }
          } else {
            this.state = State.IDLE;
          }
        }
    }
    this.onTickEnd();
  }
  clearWaitingFragment() {
    const waitingData = this.waitingData;
    if (waitingData) {
      this.fragmentTracker.removeFragment(waitingData.frag);
      this.waitingData = null;
      this.waitingVideoCC = -1;
      this.state = State.IDLE;
    }
  }
  resetLoadingState() {
    this.clearWaitingFragment();
    super.resetLoadingState();
  }
  onTickEnd() {
    const {
      media
    } = this;
    if (!(media != null && media.readyState)) {
      // Exit early if we don't have media or if the media hasn't buffered anything yet (readyState 0)
      return;
    }
    this.lastCurrentTime = media.currentTime;
  }
  doTickIdle() {
    const {
      hls,
      levels,
      media,
      trackId
    } = this;
    const config = hls.config;
    if (!(levels != null && levels[trackId])) {
      return;
    }

    // if video not attached AND
    // start fragment already requested OR start frag prefetch not enabled
    // exit loop
    // => if media not attached but start frag prefetch is enabled and start frag not requested yet, we will not exit loop
    if (!media && (this.startFragRequested || !config.startFragPrefetch)) {
      return;
    }
    const levelInfo = levels[trackId];
    const trackDetails = levelInfo.details;
    if (!trackDetails || trackDetails.live && this.levelLastLoaded !== trackId || this.waitForCdnTuneIn(trackDetails)) {
      this.state = State.WAITING_TRACK;
      return;
    }
    const bufferable = this.mediaBuffer ? this.mediaBuffer : this.media;
    if (this.bufferFlushed && bufferable) {
      this.bufferFlushed = false;
      this.afterBufferFlushed(bufferable, ElementaryStreamTypes.AUDIO, PlaylistLevelType.AUDIO);
    }
    const bufferInfo = this.getFwdBufferInfo(bufferable, PlaylistLevelType.AUDIO);
    if (bufferInfo === null) {
      return;
    }
    const {
      bufferedTrack,
      switchingTrack
    } = this;
    if (!switchingTrack && this._streamEnded(bufferInfo, trackDetails)) {
      hls.trigger(Events.BUFFER_EOS, {
        type: 'audio'
      });
      this.state = State.ENDED;
      return;
    }
    const mainBufferInfo = this.getFwdBufferInfo(this.videoBuffer ? this.videoBuffer : this.media, PlaylistLevelType.MAIN);
    const bufferLen = bufferInfo.len;
    const maxBufLen = this.getMaxBufferLength(mainBufferInfo == null ? void 0 : mainBufferInfo.len);

    // if buffer length is less than maxBufLen try to load a new fragment
    if (bufferLen >= maxBufLen && !switchingTrack) {
      return;
    }
    const fragments = trackDetails.fragments;
    const start = fragments[0].start;
    let targetBufferTime = bufferInfo.end;
    if (switchingTrack && media) {
      const pos = this.getLoadPosition();
      if (bufferedTrack && switchingTrack.attrs !== bufferedTrack.attrs) {
        targetBufferTime = pos;
      }
      // if currentTime (pos) is less than alt audio playlist start time, it means that alt audio is ahead of currentTime
      if (trackDetails.PTSKnown && pos < start) {
        // if everything is buffered from pos to start or if audio buffer upfront, let's seek to start
        if (bufferInfo.end > start || bufferInfo.nextStart) {
          this.log('Alt audio track ahead of main track, seek to start of alt audio track');
          media.currentTime = start + 0.05;
        }
      }
    }
    let frag = this.getNextFragment(targetBufferTime, trackDetails);
    let atGap = false;
    // Avoid loop loading by using nextLoadPosition set for backtracking and skipping consecutive GAP tags
    if (frag && this.isLoopLoading(frag, targetBufferTime)) {
      atGap = !!frag.gap;
      frag = this.getNextFragmentLoopLoading(frag, trackDetails, bufferInfo, PlaylistLevelType.MAIN, maxBufLen);
    }
    if (!frag) {
      this.bufferFlushed = true;
      return;
    }

    // Buffer audio up to one target duration ahead of main buffer
    const atBufferSyncLimit = mainBufferInfo && frag.start > mainBufferInfo.end + trackDetails.targetduration;
    if (atBufferSyncLimit ||
    // Or wait for main buffer after buffing some audio
    !(mainBufferInfo != null && mainBufferInfo.len) && bufferInfo.len) {
      // Check fragment-tracker for main fragments since GAP segments do not show up in bufferInfo
      const mainFrag = this.getAppendedFrag(frag.start, PlaylistLevelType.MAIN);
      if (mainFrag === null) {
        return;
      }
      // Bridge gaps in main buffer
      atGap || (atGap = !!mainFrag.gap || !!atBufferSyncLimit && mainBufferInfo.len === 0);
      if (atBufferSyncLimit && !atGap || atGap && bufferInfo.nextStart && bufferInfo.nextStart < mainFrag.end) {
        return;
      }
    }
    this.loadFragment(frag, levelInfo, targetBufferTime);
  }
  getMaxBufferLength(mainBufferLength) {
    const maxConfigBuffer = super.getMaxBufferLength();
    if (!mainBufferLength) {
      return maxConfigBuffer;
    }
    return Math.min(Math.max(maxConfigBuffer, mainBufferLength), this.config.maxMaxBufferLength);
  }
  onMediaDetaching() {
    this.videoBuffer = null;
    super.onMediaDetaching();
  }
  onAudioTracksUpdated(event, {
    audioTracks
  }) {
    this.resetTransmuxer();
    this.levels = audioTracks.map(mediaPlaylist => new Level(mediaPlaylist));
  }
  onAudioTrackSwitching(event, data) {
    // if any URL found on new audio track, it is an alternate audio track
    const altAudio = !!data.url;
    this.trackId = data.id;
    const {
      fragCurrent
    } = this;
    if (fragCurrent) {
      fragCurrent.abortRequests();
      this.removeUnbufferedFrags(fragCurrent.start);
    }
    this.resetLoadingState();
    // destroy useless transmuxer when switching audio to main
    if (!altAudio) {
      this.resetTransmuxer();
    } else {
      // switching to audio track, start timer if not already started
      this.setInterval(TICK_INTERVAL$1);
    }

    // should we switch tracks ?
    if (altAudio) {
      this.switchingTrack = data;
      // main audio track are handled by stream-controller, just do something if switching to alt audio track
      this.state = State.IDLE;
    } else {
      this.switchingTrack = null;
      this.bufferedTrack = data;
      this.state = State.STOPPED;
    }
    this.tick();
  }
  onManifestLoading() {
    this.fragmentTracker.removeAllFragments();
    this.startPosition = this.lastCurrentTime = 0;
    this.bufferFlushed = false;
    this.levels = this.mainDetails = this.waitingData = this.bufferedTrack = this.cachedTrackLoadedData = this.switchingTrack = null;
    this.startFragRequested = false;
    this.trackId = this.videoTrackCC = this.waitingVideoCC = -1;
  }
  onLevelLoaded(event, data) {
    this.mainDetails = data.details;
    if (this.cachedTrackLoadedData !== null) {
      this.hls.trigger(Events.AUDIO_TRACK_LOADED, this.cachedTrackLoadedData);
      this.cachedTrackLoadedData = null;
    }
  }
  onAudioTrackLoaded(event, data) {
    var _track$details;
    if (this.mainDetails == null) {
      this.cachedTrackLoadedData = data;
      return;
    }
    const {
      levels
    } = this;
    const {
      details: newDetails,
      id: trackId
    } = data;
    if (!levels) {
      this.warn(`Audio tracks were reset while loading level ${trackId}`);
      return;
    }
    this.log(`Track ${trackId} loaded [${newDetails.startSN},${newDetails.endSN}]${newDetails.lastPartSn ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]` : ''},duration:${newDetails.totalduration}`);
    const track = levels[trackId];
    let sliding = 0;
    if (newDetails.live || (_track$details = track.details) != null && _track$details.live) {
      this.checkLiveUpdate(newDetails);
      const mainDetails = this.mainDetails;
      if (newDetails.deltaUpdateFailed || !mainDetails) {
        return;
      }
      if (!track.details && newDetails.hasProgramDateTime && mainDetails.hasProgramDateTime) {
        // Make sure our audio rendition is aligned with the "main" rendition, using
        // pdt as our reference times.
        alignMediaPlaylistByPDT(newDetails, mainDetails);
        sliding = newDetails.fragments[0].start;
      } else {
        sliding = this.alignPlaylists(newDetails, track.details);
      }
    }
    track.details = newDetails;
    this.levelLastLoaded = trackId;

    // compute start position if we are aligned with the main playlist
    if (!this.startFragRequested && (this.mainDetails || !newDetails.live)) {
      this.setStartPosition(track.details, sliding);
    }
    // only switch back to IDLE state if we were waiting for track to start downloading a new fragment
    if (this.state === State.WAITING_TRACK && !this.waitForCdnTuneIn(newDetails)) {
      this.state = State.IDLE;
    }

    // trigger handler right now
    this.tick();
  }
  _handleFragmentLoadProgress(data) {
    var _frag$initSegment;
    const {
      frag,
      part,
      payload
    } = data;
    const {
      config,
      trackId,
      levels
    } = this;
    if (!levels) {
      this.warn(`Audio tracks were reset while fragment load was in progress. Fragment ${frag.sn} of level ${frag.level} will not be buffered`);
      return;
    }
    const track = levels[trackId];
    if (!track) {
      this.warn('Audio track is undefined on fragment load progress');
      return;
    }
    const details = track.details;
    if (!details) {
      this.warn('Audio track details undefined on fragment load progress');
      this.removeUnbufferedFrags(frag.start);
      return;
    }
    const audioCodec = config.defaultAudioCodec || track.audioCodec || 'mp4a.40.2';
    let transmuxer = this.transmuxer;
    if (!transmuxer) {
      transmuxer = this.transmuxer = new TransmuxerInterface(this.hls, PlaylistLevelType.AUDIO, this._handleTransmuxComplete.bind(this), this._handleTransmuxerFlush.bind(this));
    }

    // Check if we have video initPTS
    // If not we need to wait for it
    const initPTS = this.initPTS[frag.cc];
    const initSegmentData = (_frag$initSegment = frag.initSegment) == null ? void 0 : _frag$initSegment.data;
    if (initPTS !== undefined) {
      // this.log(`Transmuxing ${sn} of [${details.startSN} ,${details.endSN}],track ${trackId}`);
      // time Offset is accurate if level PTS is known, or if playlist is not sliding (not live)
      const accurateTimeOffset = false; // details.PTSKnown || !details.live;
      const partIndex = part ? part.index : -1;
      const partial = partIndex !== -1;
      const chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount, payload.byteLength, partIndex, partial);
      transmuxer.push(payload, initSegmentData, audioCodec, '', frag, part, details.totalduration, accurateTimeOffset, chunkMeta, initPTS);
    } else {
      this.log(`Unknown video PTS for cc ${frag.cc}, waiting for video PTS before demuxing audio frag ${frag.sn} of [${details.startSN} ,${details.endSN}],track ${trackId}`);
      const {
        cache
      } = this.waitingData = this.waitingData || {
        frag,
        part,
        cache: new ChunkCache(),
        complete: false
      };
      cache.push(new Uint8Array(payload));
      this.waitingVideoCC = this.videoTrackCC;
      this.state = State.WAITING_INIT_PTS;
    }
  }
  _handleFragmentLoadComplete(fragLoadedData) {
    if (this.waitingData) {
      this.waitingData.complete = true;
      return;
    }
    super._handleFragmentLoadComplete(fragLoadedData);
  }
  onBufferReset( /* event: Events.BUFFER_RESET */
  ) {
    // reset reference to sourcebuffers
    this.mediaBuffer = this.videoBuffer = null;
    this.loadedmetadata = false;
  }
  onBufferCreated(event, data) {
    const audioTrack = data.tracks.audio;
    if (audioTrack) {
      this.mediaBuffer = audioTrack.buffer || null;
    }
    if (data.tracks.video) {
      this.videoBuffer = data.tracks.video.buffer || null;
    }
  }
  onFragBuffered(event, data) {
    const {
      frag,
      part
    } = data;
    if (frag.type !== PlaylistLevelType.AUDIO) {
      if (!this.loadedmetadata && frag.type === PlaylistLevelType.MAIN) {
        const bufferable = this.videoBuffer || this.media;
        if (bufferable) {
          const bufferedTimeRanges = BufferHelper.getBuffered(bufferable);
          if (bufferedTimeRanges.length) {
            this.loadedmetadata = true;
          }
        }
      }
      return;
    }
    if (this.fragContextChanged(frag)) {
      // If a level switch was requested while a fragment was buffering, it will emit the FRAG_BUFFERED event upon completion
      // Avoid setting state back to IDLE or concluding the audio switch; otherwise, the switched-to track will not buffer
      this.warn(`Fragment ${frag.sn}${part ? ' p: ' + part.index : ''} of level ${frag.level} finished buffering, but was aborted. state: ${this.state}, audioSwitch: ${this.switchingTrack ? this.switchingTrack.name : 'false'}`);
      return;
    }
    if (frag.sn !== 'initSegment') {
      this.fragPrevious = frag;
      const track = this.switchingTrack;
      if (track) {
        this.bufferedTrack = track;
        this.switchingTrack = null;
        this.hls.trigger(Events.AUDIO_TRACK_SWITCHED, _objectSpread2({}, track));
      }
    }
    this.fragBufferedComplete(frag, part);
  }
  onError(event, data) {
    var _data$context;
    if (data.fatal) {
      this.state = State.ERROR;
      return;
    }
    switch (data.details) {
      case ErrorDetails.FRAG_GAP:
      case ErrorDetails.FRAG_PARSING_ERROR:
      case ErrorDetails.FRAG_DECRYPT_ERROR:
      case ErrorDetails.FRAG_LOAD_ERROR:
      case ErrorDetails.FRAG_LOAD_TIMEOUT:
      case ErrorDetails.KEY_LOAD_ERROR:
      case ErrorDetails.KEY_LOAD_TIMEOUT:
        this.onFragmentOrKeyLoadError(PlaylistLevelType.AUDIO, data);
        break;
      case ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
      case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
      case ErrorDetails.LEVEL_PARSING_ERROR:
        // in case of non fatal error while loading track, if not retrying to load track, switch back to IDLE
        if (!data.levelRetry && this.state === State.WAITING_TRACK && ((_data$context = data.context) == null ? void 0 : _data$context.type) === PlaylistContextType.AUDIO_TRACK) {
          this.state = State.IDLE;
        }
        break;
      case ErrorDetails.BUFFER_FULL_ERROR:
        if (!data.parent || data.parent !== 'audio') {
          return;
        }
        if (this.reduceLengthAndFlushBuffer(data)) {
          this.bufferedTrack = null;
          super.flushMainBuffer(0, Number.POSITIVE_INFINITY, 'audio');
        }
        break;
      case ErrorDetails.INTERNAL_EXCEPTION:
        this.recoverWorkerError(data);
        break;
    }
  }
  onBufferFlushed(event, {
    type
  }) {
    if (type === ElementaryStreamTypes.AUDIO) {
      this.bufferFlushed = true;
      if (this.state === State.ENDED) {
        this.state = State.IDLE;
      }
    }
  }
  _handleTransmuxComplete(transmuxResult) {
    var _id3$samples;
    const id = 'audio';
    const {
      hls
    } = this;
    const {
      remuxResult,
      chunkMeta
    } = transmuxResult;
    const context = this.getCurrentContext(chunkMeta);
    if (!context) {
      this.resetWhenMissingContext(chunkMeta);
      return;
    }
    const {
      frag,
      part,
      level
    } = context;
    const {
      details
    } = level;
    const {
      audio,
      text,
      id3,
      initSegment
    } = remuxResult;

    // Check if the current fragment has been aborted. We check this by first seeing if we're still playing the current level.
    // If we are, subsequently check if the currently loading fragment (fragCurrent) has changed.
    if (this.fragContextChanged(frag) || !details) {
      this.fragmentTracker.removeFragment(frag);
      return;
    }
    this.state = State.PARSING;
    if (this.switchingTrack && audio) {
      this.completeAudioSwitch(this.switchingTrack);
    }
    if (initSegment != null && initSegment.tracks) {
      const mapFragment = frag.initSegment || frag;
      this._bufferInitSegment(initSegment.tracks, mapFragment, chunkMeta);
      hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
        frag: mapFragment,
        id,
        tracks: initSegment.tracks
      });
      // Only flush audio from old audio tracks when PTS is known on new audio track
    }

    if (audio) {
      const {
        startPTS,
        endPTS,
        startDTS,
        endDTS
      } = audio;
      if (part) {
        part.elementaryStreams[ElementaryStreamTypes.AUDIO] = {
          startPTS,
          endPTS,
          startDTS,
          endDTS
        };
      }
      frag.setElementaryStreamInfo(ElementaryStreamTypes.AUDIO, startPTS, endPTS, startDTS, endDTS);
      this.bufferFragmentData(audio, frag, part, chunkMeta);
    }
    if (id3 != null && (_id3$samples = id3.samples) != null && _id3$samples.length) {
      const emittedID3 = _extends({
        id,
        frag,
        details
      }, id3);
      hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
    }
    if (text) {
      const emittedText = _extends({
        id,
        frag,
        details
      }, text);
      hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
    }
  }
  _bufferInitSegment(tracks, frag, chunkMeta) {
    if (this.state !== State.PARSING) {
      return;
    }
    // delete any video track found on audio transmuxer
    if (tracks.video) {
      delete tracks.video;
    }

    // include levelCodec in audio and video tracks
    const track = tracks.audio;
    if (!track) {
      return;
    }
    track.levelCodec = track.codec;
    track.id = 'audio';
    this.log(`Init audio buffer, container:${track.container}, codecs[parsed]=[${track.codec}]`);
    this.hls.trigger(Events.BUFFER_CODECS, tracks);
    const initSegment = track.initSegment;
    if (initSegment != null && initSegment.byteLength) {
      const segment = {
        type: 'audio',
        frag,
        part: null,
        chunkMeta,
        parent: frag.type,
        data: initSegment
      };
      this.hls.trigger(Events.BUFFER_APPENDING, segment);
    }
    // trigger handler right now
    this.tick();
  }
  loadFragment(frag, track, targetBufferTime) {
    // only load if fragment is not loaded or if in audio switch
    const fragState = this.fragmentTracker.getState(frag);
    this.fragCurrent = frag;

    // we force a frag loading in audio switch as fragment tracker might not have evicted previous frags in case of quick audio switch
    if (this.switchingTrack || fragState === FragmentState.NOT_LOADED || fragState === FragmentState.PARTIAL) {
      var _track$details2;
      if (frag.sn === 'initSegment') {
        this._loadInitSegment(frag, track);
      } else if ((_track$details2 = track.details) != null && _track$details2.live && !this.initPTS[frag.cc]) {
        this.log(`Waiting for video PTS in continuity counter ${frag.cc} of live stream before loading audio fragment ${frag.sn} of level ${this.trackId}`);
        this.state = State.WAITING_INIT_PTS;
      } else {
        this.startFragRequested = true;
        super.loadFragment(frag, track, targetBufferTime);
      }
    } else {
      this.clearTrackerIfNeeded(frag);
    }
  }
  completeAudioSwitch(switchingTrack) {
    const {
      hls,
      media,
      bufferedTrack
    } = this;
    const bufferedAttributes = bufferedTrack == null ? void 0 : bufferedTrack.attrs;
    const switchAttributes = switchingTrack.attrs;
    if (media && bufferedAttributes && (bufferedAttributes.CHANNELS !== switchAttributes.CHANNELS || bufferedAttributes.NAME !== switchAttributes.NAME || bufferedAttributes.LANGUAGE !== switchAttributes.LANGUAGE)) {
      this.log('Switching audio track : flushing all audio');
      super.flushMainBuffer(0, Number.POSITIVE_INFINITY, 'audio');
    }
    this.bufferedTrack = switchingTrack;
    this.switchingTrack = null;
    hls.trigger(Events.AUDIO_TRACK_SWITCHED, _objectSpread2({}, switchingTrack));
  }
}

class AudioTrackController extends BasePlaylistController {
  constructor(hls) {
    super(hls, '[audio-track-controller]');
    this.tracks = [];
    this.groupId = null;
    this.tracksInGroup = [];
    this.trackId = -1;
    this.currentTrack = null;
    this.selectDefaultTrack = true;
    this.registerListeners();
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.on(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
  }
  unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.off(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
  }
  destroy() {
    this.unregisterListeners();
    this.tracks.length = 0;
    this.tracksInGroup.length = 0;
    this.currentTrack = null;
    super.destroy();
  }
  onManifestLoading() {
    this.tracks = [];
    this.groupId = null;
    this.tracksInGroup = [];
    this.trackId = -1;
    this.currentTrack = null;
    this.selectDefaultTrack = true;
  }
  onManifestParsed(event, data) {
    this.tracks = data.audioTracks || [];
  }
  onAudioTrackLoaded(event, data) {
    const {
      id,
      groupId,
      details
    } = data;
    const trackInActiveGroup = this.tracksInGroup[id];
    if (!trackInActiveGroup || trackInActiveGroup.groupId !== groupId) {
      this.warn(`Track with id:${id} and group:${groupId} not found in active group ${trackInActiveGroup.groupId}`);
      return;
    }
    const curDetails = trackInActiveGroup.details;
    trackInActiveGroup.details = data.details;
    this.log(`audio-track ${id} "${trackInActiveGroup.name}" lang:${trackInActiveGroup.lang} group:${groupId} loaded [${details.startSN}-${details.endSN}]`);
    if (id === this.trackId) {
      this.playlistLoaded(id, data, curDetails);
    }
  }
  onLevelLoading(event, data) {
    this.switchLevel(data.level);
  }
  onLevelSwitching(event, data) {
    this.switchLevel(data.level);
  }
  switchLevel(levelIndex) {
    const levelInfo = this.hls.levels[levelIndex];
    if (!(levelInfo != null && levelInfo.audioGroupIds)) {
      return;
    }
    const audioGroupId = levelInfo.audioGroupIds[levelInfo.urlId];
    if (this.groupId !== audioGroupId) {
      this.groupId = audioGroupId || null;
      const audioTracks = this.tracks.filter(track => !audioGroupId || track.groupId === audioGroupId);

      // Disable selectDefaultTrack if there are no default tracks
      if (this.selectDefaultTrack && !audioTracks.some(track => track.default)) {
        this.selectDefaultTrack = false;
      }
      this.tracksInGroup = audioTracks;
      const audioTracksUpdated = {
        audioTracks
      };
      this.log(`Updating audio tracks, ${audioTracks.length} track(s) found in group:${audioGroupId}`);
      this.hls.trigger(Events.AUDIO_TRACKS_UPDATED, audioTracksUpdated);
      this.selectInitialTrack();
    } else if (this.shouldReloadPlaylist(this.currentTrack)) {
      // Retry playlist loading if no playlist is or has been loaded yet
      this.setAudioTrack(this.trackId);
    }
  }
  onError(event, data) {
    if (data.fatal || !data.context) {
      return;
    }
    if (data.context.type === PlaylistContextType.AUDIO_TRACK && data.context.id === this.trackId && data.context.groupId === this.groupId) {
      this.requestScheduled = -1;
      this.checkRetry(data);
    }
  }
  get audioTracks() {
    return this.tracksInGroup;
  }
  get audioTrack() {
    return this.trackId;
  }
  set audioTrack(newId) {
    // If audio track is selected from API then don't choose from the manifest default track
    this.selectDefaultTrack = false;
    this.setAudioTrack(newId);
  }
  setAudioTrack(newId) {
    const tracks = this.tracksInGroup;

    // check if level idx is valid
    if (newId < 0 || newId >= tracks.length) {
      this.warn('Invalid id passed to audio-track controller');
      return;
    }

    // stopping live reloading timer if any
    this.clearTimer();
    const lastTrack = this.currentTrack;
    tracks[this.trackId];
    const track = tracks[newId];
    const {
      groupId,
      name
    } = track;
    this.log(`Switching to audio-track ${newId} "${name}" lang:${track.lang} group:${groupId}`);
    this.trackId = newId;
    this.currentTrack = track;
    this.selectDefaultTrack = false;
    this.hls.trigger(Events.AUDIO_TRACK_SWITCHING, _objectSpread2({}, track));
    // Do not reload track unless live
    if (track.details && !track.details.live) {
      return;
    }
    const hlsUrlParameters = this.switchParams(track.url, lastTrack == null ? void 0 : lastTrack.details);
    this.loadPlaylist(hlsUrlParameters);
  }
  selectInitialTrack() {
    const audioTracks = this.tracksInGroup;
    const trackId = this.findTrackId(this.currentTrack) | this.findTrackId(null);
    if (trackId !== -1) {
      this.setAudioTrack(trackId);
    } else {
      const error = new Error(`No track found for running audio group-ID: ${this.groupId} track count: ${audioTracks.length}`);
      this.warn(error.message);
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.AUDIO_TRACK_LOAD_ERROR,
        fatal: true,
        error
      });
    }
  }
  findTrackId(currentTrack) {
    const audioTracks = this.tracksInGroup;
    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i];
      if (!this.selectDefaultTrack || track.default) {
        if (!currentTrack || currentTrack.attrs['STABLE-RENDITION-ID'] !== undefined && currentTrack.attrs['STABLE-RENDITION-ID'] === track.attrs['STABLE-RENDITION-ID']) {
          return track.id;
        }
        if (currentTrack.name === track.name && currentTrack.lang === track.lang) {
          return track.id;
        }
      }
    }
    return -1;
  }
  loadPlaylist(hlsUrlParameters) {
    super.loadPlaylist();
    const audioTrack = this.tracksInGroup[this.trackId];
    if (this.shouldLoadPlaylist(audioTrack)) {
      const id = audioTrack.id;
      const groupId = audioTrack.groupId;
      let url = audioTrack.url;
      if (hlsUrlParameters) {
        try {
          url = hlsUrlParameters.addDirectives(url);
        } catch (error) {
          this.warn(`Could not construct new URL with HLS Delivery Directives: ${error}`);
        }
      }
      // track not retrieved yet, or live playlist we need to (re)load it
      this.log(`loading audio-track playlist ${id} "${audioTrack.name}" lang:${audioTrack.lang} group:${groupId}`);
      this.clearTimer();
      this.hls.trigger(Events.AUDIO_TRACK_LOADING, {
        url,
        id,
        groupId,
        deliveryDirectives: hlsUrlParameters || null
      });
    }
  }
}

function subtitleOptionsIdentical(trackList1, trackList2) {
  if (trackList1.length !== trackList2.length) {
    return false;
  }
  for (let i = 0; i < trackList1.length; i++) {
    if (!subtitleAttributesIdentical(trackList1[i].attrs, trackList2[i].attrs)) {
      return false;
    }
  }
  return true;
}
function subtitleAttributesIdentical(attrs1, attrs2) {
  // Media options with the same rendition ID must be bit identical
  const stableRenditionId = attrs1['STABLE-RENDITION-ID'];
  if (stableRenditionId) {
    return stableRenditionId === attrs2['STABLE-RENDITION-ID'];
  }
  // When rendition ID is not present, compare attributes
  return !['LANGUAGE', 'NAME', 'CHARACTERISTICS', 'AUTOSELECT', 'DEFAULT', 'FORCED'].some(subtitleAttribute => attrs1[subtitleAttribute] !== attrs2[subtitleAttribute]);
}

const TICK_INTERVAL = 500; // how often to tick in ms

class SubtitleStreamController extends BaseStreamController {
  constructor(hls, fragmentTracker, keyLoader) {
    super(hls, fragmentTracker, keyLoader, '[subtitle-stream-controller]', PlaylistLevelType.SUBTITLE);
    this.levels = [];
    this.currentTrackId = -1;
    this.tracksBuffered = [];
    this.mainDetails = null;
    this._registerListeners();
  }
  onHandlerDestroying() {
    this._unregisterListeners();
    this.mainDetails = null;
  }
  _registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
    hls.on(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.on(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
    hls.on(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.on(Events.SUBTITLE_FRAG_PROCESSED, this.onSubtitleFragProcessed, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }
  _unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
    hls.off(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.off(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
    hls.off(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.off(Events.SUBTITLE_FRAG_PROCESSED, this.onSubtitleFragProcessed, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }
  startLoad(startPosition) {
    this.stopLoad();
    this.state = State.IDLE;
    this.setInterval(TICK_INTERVAL);
    this.nextLoadPosition = this.startPosition = this.lastCurrentTime = startPosition;
    this.tick();
  }
  onManifestLoading() {
    this.mainDetails = null;
    this.fragmentTracker.removeAllFragments();
  }
  onMediaDetaching() {
    this.tracksBuffered = [];
    super.onMediaDetaching();
  }
  onLevelLoaded(event, data) {
    this.mainDetails = data.details;
  }
  onSubtitleFragProcessed(event, data) {
    const {
      frag,
      success
    } = data;
    this.fragPrevious = frag;
    this.state = State.IDLE;
    if (!success) {
      return;
    }
    const buffered = this.tracksBuffered[this.currentTrackId];
    if (!buffered) {
      return;
    }

    // Create/update a buffered array matching the interface used by BufferHelper.bufferedInfo
    // so we can re-use the logic used to detect how much has been buffered
    let timeRange;
    const fragStart = frag.start;
    for (let i = 0; i < buffered.length; i++) {
      if (fragStart >= buffered[i].start && fragStart <= buffered[i].end) {
        timeRange = buffered[i];
        break;
      }
    }
    const fragEnd = frag.start + frag.duration;
    if (timeRange) {
      timeRange.end = fragEnd;
    } else {
      timeRange = {
        start: fragStart,
        end: fragEnd
      };
      buffered.push(timeRange);
    }
    this.fragmentTracker.fragBuffered(frag);
  }
  onBufferFlushing(event, data) {
    const {
      startOffset,
      endOffset
    } = data;
    if (startOffset === 0 && endOffset !== Number.POSITIVE_INFINITY) {
      const endOffsetSubtitles = endOffset - 1;
      if (endOffsetSubtitles <= 0) {
        return;
      }
      data.endOffsetSubtitles = Math.max(0, endOffsetSubtitles);
      this.tracksBuffered.forEach(buffered => {
        for (let i = 0; i < buffered.length;) {
          if (buffered[i].end <= endOffsetSubtitles) {
            buffered.shift();
            continue;
          } else if (buffered[i].start < endOffsetSubtitles) {
            buffered[i].start = endOffsetSubtitles;
          } else {
            break;
          }
          i++;
        }
      });
      this.fragmentTracker.removeFragmentsInRange(startOffset, endOffsetSubtitles, PlaylistLevelType.SUBTITLE);
    }
  }
  onFragBuffered(event, data) {
    if (!this.loadedmetadata && data.frag.type === PlaylistLevelType.MAIN) {
      var _this$media;
      if ((_this$media = this.media) != null && _this$media.buffered.length) {
        this.loadedmetadata = true;
      }
    }
  }

  // If something goes wrong, proceed to next frag, if we were processing one.
  onError(event, data) {
    const frag = data.frag;
    if ((frag == null ? void 0 : frag.type) === PlaylistLevelType.SUBTITLE) {
      if (this.fragCurrent) {
        this.fragCurrent.abortRequests();
      }
      if (this.state !== State.STOPPED) {
        this.state = State.IDLE;
      }
    }
  }

  // Got all new subtitle levels.
  onSubtitleTracksUpdated(event, {
    subtitleTracks
  }) {
    if (subtitleOptionsIdentical(this.levels, subtitleTracks)) {
      this.levels = subtitleTracks.map(mediaPlaylist => new Level(mediaPlaylist));
      return;
    }
    this.tracksBuffered = [];
    this.levels = subtitleTracks.map(mediaPlaylist => {
      const level = new Level(mediaPlaylist);
      this.tracksBuffered[level.id] = [];
      return level;
    });
    this.fragmentTracker.removeFragmentsInRange(0, Number.POSITIVE_INFINITY, PlaylistLevelType.SUBTITLE);
    this.fragPrevious = null;
    this.mediaBuffer = null;
  }
  onSubtitleTrackSwitch(event, data) {
    this.currentTrackId = data.id;
    if (!this.levels.length || this.currentTrackId === -1) {
      this.clearInterval();
      return;
    }

    // Check if track has the necessary details to load fragments
    const currentTrack = this.levels[this.currentTrackId];
    if (currentTrack != null && currentTrack.details) {
      this.mediaBuffer = this.mediaBufferTimeRanges;
    } else {
      this.mediaBuffer = null;
    }
    if (currentTrack) {
      this.setInterval(TICK_INTERVAL);
    }
  }

  // Got a new set of subtitle fragments.
  onSubtitleTrackLoaded(event, data) {
    var _track$details;
    const {
      details: newDetails,
      id: trackId
    } = data;
    const {
      currentTrackId,
      levels
    } = this;
    if (!levels.length) {
      return;
    }
    const track = levels[currentTrackId];
    if (trackId >= levels.length || trackId !== currentTrackId || !track) {
      return;
    }
    this.mediaBuffer = this.mediaBufferTimeRanges;
    let sliding = 0;
    if (newDetails.live || (_track$details = track.details) != null && _track$details.live) {
      const mainDetails = this.mainDetails;
      if (newDetails.deltaUpdateFailed || !mainDetails) {
        return;
      }
      const mainSlidingStartFragment = mainDetails.fragments[0];
      if (!track.details) {
        if (newDetails.hasProgramDateTime && mainDetails.hasProgramDateTime) {
          alignMediaPlaylistByPDT(newDetails, mainDetails);
          sliding = newDetails.fragments[0].start;
        } else if (mainSlidingStartFragment) {
          // line up live playlist with main so that fragments in range are loaded
          sliding = mainSlidingStartFragment.start;
          addSliding(newDetails, sliding);
        }
      } else {
        sliding = this.alignPlaylists(newDetails, track.details);
        if (sliding === 0 && mainSlidingStartFragment) {
          // realign with main when there is no overlap with last refresh
          sliding = mainSlidingStartFragment.start;
          addSliding(newDetails, sliding);
        }
      }
    }
    track.details = newDetails;
    this.levelLastLoaded = trackId;
    if (!this.startFragRequested && (this.mainDetails || !newDetails.live)) {
      this.setStartPosition(track.details, sliding);
    }

    // trigger handler right now
    this.tick();

    // If playlist is misaligned because of bad PDT or drift, delete details to resync with main on reload
    if (newDetails.live && !this.fragCurrent && this.media && this.state === State.IDLE) {
      const foundFrag = findFragmentByPTS(null, newDetails.fragments, this.media.currentTime, 0);
      if (!foundFrag) {
        this.warn('Subtitle playlist not aligned with playback');
        track.details = undefined;
      }
    }
  }
  _handleFragmentLoadComplete(fragLoadedData) {
    const {
      frag,
      payload
    } = fragLoadedData;
    const decryptData = frag.decryptdata;
    const hls = this.hls;
    if (this.fragContextChanged(frag)) {
      return;
    }
    // check to see if the payload needs to be decrypted
    if (payload && payload.byteLength > 0 && decryptData && decryptData.key && decryptData.iv && decryptData.method === 'AES-128') {
      const startTime = performance.now();
      // decrypt the subtitles
      this.decrypter.decrypt(new Uint8Array(payload), decryptData.key.buffer, decryptData.iv.buffer).catch(err => {
        hls.trigger(Events.ERROR, {
          type: ErrorTypes.MEDIA_ERROR,
          details: ErrorDetails.FRAG_DECRYPT_ERROR,
          fatal: false,
          error: err,
          reason: err.message,
          frag
        });
        throw err;
      }).then(decryptedData => {
        const endTime = performance.now();
        hls.trigger(Events.FRAG_DECRYPTED, {
          frag,
          payload: decryptedData,
          stats: {
            tstart: startTime,
            tdecrypt: endTime
          }
        });
      }).catch(err => {
        this.warn(`${err.name}: ${err.message}`);
        this.state = State.IDLE;
      });
    }
  }
  doTick() {
    if (!this.media) {
      this.state = State.IDLE;
      return;
    }
    if (this.state === State.IDLE) {
      const {
        currentTrackId,
        levels
      } = this;
      const track = levels[currentTrackId];
      if (!levels.length || !track || !track.details) {
        return;
      }
      const {
        config
      } = this;
      const currentTime = this.getLoadPosition();
      const bufferedInfo = BufferHelper.bufferedInfo(this.tracksBuffered[this.currentTrackId] || [], currentTime, config.maxBufferHole);
      const {
        end: targetBufferTime,
        len: bufferLen
      } = bufferedInfo;
      const mainBufferInfo = this.getFwdBufferInfo(this.media, PlaylistLevelType.MAIN);
      const trackDetails = track.details;
      const maxBufLen = this.getMaxBufferLength(mainBufferInfo == null ? void 0 : mainBufferInfo.len) + trackDetails.levelTargetDuration;
      if (bufferLen > maxBufLen) {
        return;
      }
      const fragments = trackDetails.fragments;
      const fragLen = fragments.length;
      const end = trackDetails.edge;
      let foundFrag = null;
      const fragPrevious = this.fragPrevious;
      if (targetBufferTime < end) {
        const tolerance = config.maxFragLookUpTolerance;
        const lookupTolerance = targetBufferTime > end - tolerance ? 0 : tolerance;
        foundFrag = findFragmentByPTS(fragPrevious, fragments, Math.max(fragments[0].start, targetBufferTime), lookupTolerance);
        if (!foundFrag && fragPrevious && fragPrevious.start < fragments[0].start) {
          foundFrag = fragments[0];
        }
      } else {
        foundFrag = fragments[fragLen - 1];
      }
      if (!foundFrag) {
        return;
      }
      foundFrag = this.mapToInitFragWhenRequired(foundFrag);
      if (foundFrag.sn !== 'initSegment') {
        // Load earlier fragment in same discontinuity to make up for misaligned playlists and cues that extend beyond end of segment
        const curSNIdx = foundFrag.sn - trackDetails.startSN;
        const prevFrag = fragments[curSNIdx - 1];
        if (prevFrag && prevFrag.cc === foundFrag.cc && this.fragmentTracker.getState(prevFrag) === FragmentState.NOT_LOADED) {
          foundFrag = prevFrag;
        }
      }
      if (this.fragmentTracker.getState(foundFrag) === FragmentState.NOT_LOADED) {
        // only load if fragment is not loaded
        this.loadFragment(foundFrag, track, targetBufferTime);
      }
    }
  }
  getMaxBufferLength(mainBufferLength) {
    const maxConfigBuffer = super.getMaxBufferLength();
    if (!mainBufferLength) {
      return maxConfigBuffer;
    }
    return Math.max(maxConfigBuffer, mainBufferLength);
  }
  loadFragment(frag, level, targetBufferTime) {
    this.fragCurrent = frag;
    if (frag.sn === 'initSegment') {
      this._loadInitSegment(frag, level);
    } else {
      this.startFragRequested = true;
      super.loadFragment(frag, level, targetBufferTime);
    }
  }
  get mediaBufferTimeRanges() {
    return new BufferableInstance(this.tracksBuffered[this.currentTrackId] || []);
  }
}
class BufferableInstance {
  constructor(timeranges) {
    this.buffered = void 0;
    const getRange = (name, index, length) => {
      index = index >>> 0;
      if (index > length - 1) {
        throw new DOMException(`Failed to execute '${name}' on 'TimeRanges': The index provided (${index}) is greater than the maximum bound (${length})`);
      }
      return timeranges[index][name];
    };
    this.buffered = {
      get length() {
        return timeranges.length;
      },
      end(index) {
        return getRange('end', index, timeranges.length);
      },
      start(index) {
        return getRange('start', index, timeranges.length);
      }
    };
  }
}

class SubtitleTrackController extends BasePlaylistController {
  constructor(hls) {
    super(hls, '[subtitle-track-controller]');
    this.media = null;
    this.tracks = [];
    this.groupId = null;
    this.tracksInGroup = [];
    this.trackId = -1;
    this.selectDefaultTrack = true;
    this.queuedDefaultTrack = -1;
    this.trackChangeListener = () => this.onTextTracksChanged();
    this.asyncPollTrackChange = () => this.pollTrackChange(0);
    this.useTextTrackPolling = false;
    this.subtitlePollingInterval = -1;
    this._subtitleDisplay = true;
    this.registerListeners();
  }
  destroy() {
    this.unregisterListeners();
    this.tracks.length = 0;
    this.tracksInGroup.length = 0;
    this.trackChangeListener = this.asyncPollTrackChange = null;
    super.destroy();
  }
  get subtitleDisplay() {
    return this._subtitleDisplay;
  }
  set subtitleDisplay(value) {
    this._subtitleDisplay = value;
    if (this.trackId > -1) {
      this.toggleTrackModes(this.trackId);
    }
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.on(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
  }
  unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.off(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  // Listen for subtitle track change, then extract the current track ID.
  onMediaAttached(event, data) {
    this.media = data.media;
    if (!this.media) {
      return;
    }
    if (this.queuedDefaultTrack > -1) {
      this.subtitleTrack = this.queuedDefaultTrack;
      this.queuedDefaultTrack = -1;
    }
    this.useTextTrackPolling = !(this.media.textTracks && 'onchange' in this.media.textTracks);
    if (this.useTextTrackPolling) {
      this.pollTrackChange(500);
    } else {
      this.media.textTracks.addEventListener('change', this.asyncPollTrackChange);
    }
  }
  pollTrackChange(timeout) {
    self.clearInterval(this.subtitlePollingInterval);
    this.subtitlePollingInterval = self.setInterval(this.trackChangeListener, timeout);
  }
  onMediaDetaching() {
    if (!this.media) {
      return;
    }
    self.clearInterval(this.subtitlePollingInterval);
    if (!this.useTextTrackPolling) {
      this.media.textTracks.removeEventListener('change', this.asyncPollTrackChange);
    }
    if (this.trackId > -1) {
      this.queuedDefaultTrack = this.trackId;
    }
    const textTracks = filterSubtitleTracks(this.media.textTracks);
    // Clear loaded cues on media detachment from tracks
    textTracks.forEach(track => {
      clearCurrentCues(track);
    });
    // Disable all subtitle tracks before detachment so when reattached only tracks in that content are enabled.
    this.subtitleTrack = -1;
    this.media = null;
  }
  onManifestLoading() {
    this.tracks = [];
    this.groupId = null;
    this.tracksInGroup = [];
    this.trackId = -1;
    this.selectDefaultTrack = true;
  }

  // Fired whenever a new manifest is loaded.
  onManifestParsed(event, data) {
    this.tracks = data.subtitleTracks;
  }
  onSubtitleTrackLoaded(event, data) {
    const {
      id,
      details
    } = data;
    const {
      trackId
    } = this;
    const currentTrack = this.tracksInGroup[trackId];
    if (!currentTrack) {
      this.warn(`Invalid subtitle track id ${id}`);
      return;
    }
    const curDetails = currentTrack.details;
    currentTrack.details = data.details;
    this.log(`subtitle track ${id} loaded [${details.startSN}-${details.endSN}]`);
    if (id === this.trackId) {
      this.playlistLoaded(id, data, curDetails);
    }
  }
  onLevelLoading(event, data) {
    this.switchLevel(data.level);
  }
  onLevelSwitching(event, data) {
    this.switchLevel(data.level);
  }
  switchLevel(levelIndex) {
    const levelInfo = this.hls.levels[levelIndex];
    if (!(levelInfo != null && levelInfo.textGroupIds)) {
      return;
    }
    const textGroupId = levelInfo.textGroupIds[levelInfo.urlId];
    const lastTrack = this.tracksInGroup ? this.tracksInGroup[this.trackId] : undefined;
    if (this.groupId !== textGroupId) {
      const subtitleTracks = this.tracks.filter(track => !textGroupId || track.groupId === textGroupId);
      this.tracksInGroup = subtitleTracks;
      const initialTrackId = this.findTrackId(lastTrack == null ? void 0 : lastTrack.name) || this.findTrackId();
      this.groupId = textGroupId || null;
      const subtitleTracksUpdated = {
        subtitleTracks
      };
      this.log(`Updating subtitle tracks, ${subtitleTracks.length} track(s) found in "${textGroupId}" group-id`);
      this.hls.trigger(Events.SUBTITLE_TRACKS_UPDATED, subtitleTracksUpdated);
      if (initialTrackId !== -1) {
        this.setSubtitleTrack(initialTrackId, lastTrack);
      }
    } else if (this.shouldReloadPlaylist(lastTrack)) {
      // Retry playlist loading if no playlist is or has been loaded yet
      this.setSubtitleTrack(this.trackId, lastTrack);
    }
  }
  findTrackId(name) {
    const textTracks = this.tracksInGroup;
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (!this.selectDefaultTrack || track.default) {
        if (!name || name === track.name) {
          return track.id;
        }
      }
    }
    return -1;
  }
  onError(event, data) {
    if (data.fatal || !data.context) {
      return;
    }
    if (data.context.type === PlaylistContextType.SUBTITLE_TRACK && data.context.id === this.trackId && data.context.groupId === this.groupId) {
      this.checkRetry(data);
    }
  }

  /** get alternate subtitle tracks list from playlist **/
  get subtitleTracks() {
    return this.tracksInGroup;
  }

  /** get/set index of the selected subtitle track (based on index in subtitle track lists) **/
  get subtitleTrack() {
    return this.trackId;
  }
  set subtitleTrack(newId) {
    this.selectDefaultTrack = false;
    const lastTrack = this.tracksInGroup ? this.tracksInGroup[this.trackId] : undefined;
    this.setSubtitleTrack(newId, lastTrack);
  }
  loadPlaylist(hlsUrlParameters) {
    super.loadPlaylist();
    const currentTrack = this.tracksInGroup[this.trackId];
    if (this.shouldLoadPlaylist(currentTrack)) {
      const id = currentTrack.id;
      const groupId = currentTrack.groupId;
      let url = currentTrack.url;
      if (hlsUrlParameters) {
        try {
          url = hlsUrlParameters.addDirectives(url);
        } catch (error) {
          this.warn(`Could not construct new URL with HLS Delivery Directives: ${error}`);
        }
      }
      this.log(`Loading subtitle playlist for id ${id}`);
      this.hls.trigger(Events.SUBTITLE_TRACK_LOADING, {
        url,
        id,
        groupId,
        deliveryDirectives: hlsUrlParameters || null
      });
    }
  }

  /**
   * Disables the old subtitleTrack and sets current mode on the next subtitleTrack.
   * This operates on the DOM textTracks.
   * A value of -1 will disable all subtitle tracks.
   */
  toggleTrackModes(newId) {
    const {
      media,
      trackId
    } = this;
    if (!media) {
      return;
    }
    const textTracks = filterSubtitleTracks(media.textTracks);
    const groupTracks = textTracks.filter(track => track.groupId === this.groupId);
    if (newId === -1) {
      [].slice.call(textTracks).forEach(track => {
        track.mode = 'disabled';
      });
    } else {
      const oldTrack = groupTracks[trackId];
      if (oldTrack) {
        oldTrack.mode = 'disabled';
      }
    }
    const nextTrack = groupTracks[newId];
    if (nextTrack) {
      nextTrack.mode = this.subtitleDisplay ? 'showing' : 'hidden';
    }
  }

  /**
   * This method is responsible for validating the subtitle index and periodically reloading if live.
   * Dispatches the SUBTITLE_TRACK_SWITCH event, which instructs the subtitle-stream-controller to load the selected track.
   */
  setSubtitleTrack(newId, lastTrack) {
    var _tracks$newId;
    const tracks = this.tracksInGroup;

    // setting this.subtitleTrack will trigger internal logic
    // if media has not been attached yet, it will fail
    // we keep a reference to the default track id
    // and we'll set subtitleTrack when onMediaAttached is triggered
    if (!this.media) {
      this.queuedDefaultTrack = newId;
      return;
    }
    if (this.trackId !== newId) {
      this.toggleTrackModes(newId);
    }

    // exit if track id as already set or invalid
    if (this.trackId === newId && (newId === -1 || (_tracks$newId = tracks[newId]) != null && _tracks$newId.details) || newId < -1 || newId >= tracks.length) {
      return;
    }

    // stopping live reloading timer if any
    this.clearTimer();
    const track = tracks[newId];
    this.log(`Switching to subtitle-track ${newId}` + (track ? ` "${track.name}" lang:${track.lang} group:${track.groupId}` : ''));
    this.trackId = newId;
    if (track) {
      const {
        id,
        groupId = '',
        name,
        type,
        url
      } = track;
      this.hls.trigger(Events.SUBTITLE_TRACK_SWITCH, {
        id,
        groupId,
        name,
        type,
        url
      });
      const hlsUrlParameters = this.switchParams(track.url, lastTrack == null ? void 0 : lastTrack.details);
      this.loadPlaylist(hlsUrlParameters);
    } else {
      // switch to -1
      this.hls.trigger(Events.SUBTITLE_TRACK_SWITCH, {
        id: newId
      });
    }
  }
  onTextTracksChanged() {
    if (!this.useTextTrackPolling) {
      self.clearInterval(this.subtitlePollingInterval);
    }
    // Media is undefined when switching streams via loadSource()
    if (!this.media || !this.hls.config.renderTextTracksNatively) {
      return;
    }
    let trackId = -1;
    const tracks = filterSubtitleTracks(this.media.textTracks);
    for (let id = 0; id < tracks.length; id++) {
      if (tracks[id].mode === 'hidden') {
        // Do not break in case there is a following track with showing.
        trackId = id;
      } else if (tracks[id].mode === 'showing') {
        trackId = id;
        break;
      }
    }

    // Setting current subtitleTrack will invoke code.
    if (this.subtitleTrack !== trackId) {
      this.subtitleTrack = trackId;
    }
  }
}
function filterSubtitleTracks(textTrackList) {
  const tracks = [];
  for (let i = 0; i < textTrackList.length; i++) {
    const track = textTrackList[i];
    // Edge adds a track without a label; we don't want to use it
    if ((track.kind === 'subtitles' || track.kind === 'captions') && track.label) {
      tracks.push(textTrackList[i]);
    }
  }
  return tracks;
}

class BufferOperationQueue {
  constructor(sourceBufferReference) {
    this.buffers = void 0;
    this.queues = {
      video: [],
      audio: [],
      audiovideo: []
    };
    this.buffers = sourceBufferReference;
  }
  append(operation, type) {
    const queue = this.queues[type];
    queue.push(operation);
    if (queue.length === 1 && this.buffers[type]) {
      this.executeNext(type);
    }
  }
  insertAbort(operation, type) {
    const queue = this.queues[type];
    queue.unshift(operation);
    this.executeNext(type);
  }
  appendBlocker(type) {
    let execute;
    const promise = new Promise(resolve => {
      execute = resolve;
    });
    const operation = {
      execute,
      onStart: () => {},
      onComplete: () => {},
      onError: () => {}
    };
    this.append(operation, type);
    return promise;
  }
  executeNext(type) {
    const {
      buffers,
      queues
    } = this;
    const sb = buffers[type];
    const queue = queues[type];
    if (queue.length) {
      const operation = queue[0];
      try {
        // Operations are expected to result in an 'updateend' event being fired. If not, the queue will lock. Operations
        // which do not end with this event must call _onSBUpdateEnd manually
        operation.execute();
      } catch (e) {
        logger.warn('[buffer-operation-queue]: Unhandled exception executing the current operation');
        operation.onError(e);

        // Only shift the current operation off, otherwise the updateend handler will do this for us
        if (!(sb != null && sb.updating)) {
          queue.shift();
          this.executeNext(type);
        }
      }
    }
  }
  shiftAndExecuteNext(type) {
    this.queues[type].shift();
    this.executeNext(type);
  }
  current(type) {
    return this.queues[type][0];
  }
}

const MediaSource = getMediaSource();
const VIDEO_CODEC_PROFILE_REPACE = /([ha]vc.)(?:\.[^.,]+)+/;
class BufferController {
  // The level details used to determine duration, target-duration and live

  // cache the self generated object url to detect hijack of video tag

  // A queue of buffer operations which require the SourceBuffer to not be updating upon execution

  // References to event listeners for each SourceBuffer, so that they can be referenced for event removal

  // The number of BUFFER_CODEC events received before any sourceBuffers are created

  // The total number of BUFFER_CODEC events received

  // A reference to the attached media element

  // A reference to the active media source

  // Last MP3 audio chunk appended

  // counters

  constructor(hls) {
    this.details = null;
    this._objectUrl = null;
    this.operationQueue = void 0;
    this.listeners = void 0;
    this.hls = void 0;
    this.bufferCodecEventsExpected = 0;
    this._bufferCodecEventsTotal = 0;
    this.media = null;
    this.mediaSource = null;
    this.lastMpegAudioChunk = null;
    this.appendError = 0;
    this.tracks = {};
    this.pendingTracks = {};
    this.sourceBuffer = void 0;
    // Keep as arrow functions so that we can directly reference these functions directly as event listeners
    this._onMediaSourceOpen = () => {
      const {
        media,
        mediaSource
      } = this;
      logger.log('[buffer-controller]: Media source opened');
      if (media) {
        media.removeEventListener('emptied', this._onMediaEmptied);
        this.updateMediaElementDuration();
        this.hls.trigger(Events.MEDIA_ATTACHED, {
          media
        });
      }
      if (mediaSource) {
        // once received, don't listen anymore to sourceopen event
        mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);
      }
      this.checkPendingTracks();
    };
    this._onMediaSourceClose = () => {
      logger.log('[buffer-controller]: Media source closed');
    };
    this._onMediaSourceEnded = () => {
      logger.log('[buffer-controller]: Media source ended');
    };
    this._onMediaEmptied = () => {
      const {
        media,
        _objectUrl
      } = this;
      if (media && media.src !== _objectUrl) {
        logger.error(`Media element src was set while attaching MediaSource (${_objectUrl} > ${media.src})`);
      }
    };
    this.hls = hls;
    this._initSourceBuffer();
    this.registerListeners();
  }
  hasSourceTypes() {
    return this.getSourceBufferTypes().length > 0 || Object.keys(this.pendingTracks).length > 0;
  }
  destroy() {
    this.unregisterListeners();
    this.details = null;
    this.lastMpegAudioChunk = null;
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.on(Events.BUFFER_APPENDING, this.onBufferAppending, this);
    hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.on(Events.BUFFER_EOS, this.onBufferEos, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.on(Events.FRAG_PARSED, this.onFragParsed, this);
    hls.on(Events.FRAG_CHANGED, this.onFragChanged, this);
  }
  unregisterListeners() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.off(Events.BUFFER_APPENDING, this.onBufferAppending, this);
    hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.off(Events.BUFFER_EOS, this.onBufferEos, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.off(Events.FRAG_PARSED, this.onFragParsed, this);
    hls.off(Events.FRAG_CHANGED, this.onFragChanged, this);
  }
  _initSourceBuffer() {
    this.sourceBuffer = {};
    this.operationQueue = new BufferOperationQueue(this.sourceBuffer);
    this.listeners = {
      audio: [],
      video: [],
      audiovideo: []
    };
    this.lastMpegAudioChunk = null;
  }
  onManifestLoading() {
    this.bufferCodecEventsExpected = this._bufferCodecEventsTotal = 0;
    this.details = null;
  }
  onManifestParsed(event, data) {
    // in case of alt audio 2 BUFFER_CODECS events will be triggered, one per stream controller
    // sourcebuffers will be created all at once when the expected nb of tracks will be reached
    // in case alt audio is not used, only one BUFFER_CODEC event will be fired from main stream controller
    // it will contain the expected nb of source buffers, no need to compute it
    let codecEvents = 2;
    if (data.audio && !data.video || !data.altAudio || !true) {
      codecEvents = 1;
    }
    this.bufferCodecEventsExpected = this._bufferCodecEventsTotal = codecEvents;
    logger.log(`${this.bufferCodecEventsExpected} bufferCodec event(s) expected`);
  }
  onMediaAttaching(event, data) {
    const media = this.media = data.media;
    if (media && MediaSource) {
      const ms = this.mediaSource = new MediaSource();
      // MediaSource listeners are arrow functions with a lexical scope, and do not need to be bound
      ms.addEventListener('sourceopen', this._onMediaSourceOpen);
      ms.addEventListener('sourceended', this._onMediaSourceEnded);
      ms.addEventListener('sourceclose', this._onMediaSourceClose);
      // link video and media Source
      media.src = self.URL.createObjectURL(ms);
      // cache the locally generated object url
      this._objectUrl = media.src;
      media.addEventListener('emptied', this._onMediaEmptied);
    }
  }
  onMediaDetaching() {
    const {
      media,
      mediaSource,
      _objectUrl
    } = this;
    if (mediaSource) {
      logger.log('[buffer-controller]: media source detaching');
      if (mediaSource.readyState === 'open') {
        try {
          // endOfStream could trigger exception if any sourcebuffer is in updating state
          // we don't really care about checking sourcebuffer state here,
          // as we are anyway detaching the MediaSource
          // let's just avoid this exception to propagate
          mediaSource.endOfStream();
        } catch (err) {
          logger.warn(`[buffer-controller]: onMediaDetaching: ${err.message} while calling endOfStream`);
        }
      }
      // Clean up the SourceBuffers by invoking onBufferReset
      this.onBufferReset();
      mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);
      mediaSource.removeEventListener('sourceended', this._onMediaSourceEnded);
      mediaSource.removeEventListener('sourceclose', this._onMediaSourceClose);

      // Detach properly the MediaSource from the HTMLMediaElement as
      // suggested in https://github.com/w3c/media-source/issues/53.
      if (media) {
        media.removeEventListener('emptied', this._onMediaEmptied);
        if (_objectUrl) {
          self.URL.revokeObjectURL(_objectUrl);
        }

        // clean up video tag src only if it's our own url. some external libraries might
        // hijack the video tag and change its 'src' without destroying the Hls instance first
        if (media.src === _objectUrl) {
          media.removeAttribute('src');
          media.load();
        } else {
          logger.warn('[buffer-controller]: media.src was changed by a third party - skip cleanup');
        }
      }
      this.mediaSource = null;
      this.media = null;
      this._objectUrl = null;
      this.bufferCodecEventsExpected = this._bufferCodecEventsTotal;
      this.pendingTracks = {};
      this.tracks = {};
    }
    this.hls.trigger(Events.MEDIA_DETACHED, undefined);
  }
  onBufferReset() {
    this.getSourceBufferTypes().forEach(type => {
      const sb = this.sourceBuffer[type];
      try {
        if (sb) {
          this.removeBufferListeners(type);
          if (this.mediaSource) {
            this.mediaSource.removeSourceBuffer(sb);
          }
          // Synchronously remove the SB from the map before the next call in order to prevent an async function from
          // accessing it
          this.sourceBuffer[type] = undefined;
        }
      } catch (err) {
        logger.warn(`[buffer-controller]: Failed to reset the ${type} buffer`, err);
      }
    });
    this._initSourceBuffer();
  }
  onBufferCodecs(event, data) {
    const sourceBufferCount = this.getSourceBufferTypes().length;
    Object.keys(data).forEach(trackName => {
      if (sourceBufferCount) {
        // check if SourceBuffer codec needs to change
        const track = this.tracks[trackName];
        if (track && typeof track.buffer.changeType === 'function') {
          const {
            id,
            codec,
            levelCodec,
            container,
            metadata
          } = data[trackName];
          const currentCodec = (track.levelCodec || track.codec).replace(VIDEO_CODEC_PROFILE_REPACE, '$1');
          const nextCodec = (levelCodec || codec).replace(VIDEO_CODEC_PROFILE_REPACE, '$1');
          if (currentCodec !== nextCodec) {
            const mimeType = `${container};codecs=${levelCodec || codec}`;
            this.appendChangeType(trackName, mimeType);
            logger.log(`[buffer-controller]: switching codec ${currentCodec} to ${nextCodec}`);
            this.tracks[trackName] = {
              buffer: track.buffer,
              codec,
              container,
              levelCodec,
              metadata,
              id
            };
          }
        }
      } else {
        // if source buffer(s) not created yet, appended buffer tracks in this.pendingTracks
        this.pendingTracks[trackName] = data[trackName];
      }
    });

    // if sourcebuffers already created, do nothing ...
    if (sourceBufferCount) {
      return;
    }
    this.bufferCodecEventsExpected = Math.max(this.bufferCodecEventsExpected - 1, 0);
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.checkPendingTracks();
    }
  }
  appendChangeType(type, mimeType) {
    const {
      operationQueue
    } = this;
    const operation = {
      execute: () => {
        const sb = this.sourceBuffer[type];
        if (sb) {
          logger.log(`[buffer-controller]: changing ${type} sourceBuffer type to ${mimeType}`);
          sb.changeType(mimeType);
        }
        operationQueue.shiftAndExecuteNext(type);
      },
      onStart: () => {},
      onComplete: () => {},
      onError: e => {
        logger.warn(`[buffer-controller]: Failed to change ${type} SourceBuffer type`, e);
      }
    };
    operationQueue.append(operation, type);
  }
  onBufferAppending(event, eventData) {
    const {
      hls,
      operationQueue,
      tracks
    } = this;
    const {
      data,
      type,
      frag,
      part,
      chunkMeta
    } = eventData;
    const chunkStats = chunkMeta.buffering[type];
    const bufferAppendingStart = self.performance.now();
    chunkStats.start = bufferAppendingStart;
    const fragBuffering = frag.stats.buffering;
    const partBuffering = part ? part.stats.buffering : null;
    if (fragBuffering.start === 0) {
      fragBuffering.start = bufferAppendingStart;
    }
    if (partBuffering && partBuffering.start === 0) {
      partBuffering.start = bufferAppendingStart;
    }

    // TODO: Only update timestampOffset when audio/mpeg fragment or part is not contiguous with previously appended
    // Adjusting `SourceBuffer.timestampOffset` (desired point in the timeline where the next frames should be appended)
    // in Chrome browser when we detect MPEG audio container and time delta between level PTS and `SourceBuffer.timestampOffset`
    // is greater than 100ms (this is enough to handle seek for VOD or level change for LIVE videos).
    // More info here: https://github.com/video-dev/hls.js/issues/332#issuecomment-257986486
    const audioTrack = tracks.audio;
    let checkTimestampOffset = false;
    if (type === 'audio' && (audioTrack == null ? void 0 : audioTrack.container) === 'audio/mpeg') {
      checkTimestampOffset = !this.lastMpegAudioChunk || chunkMeta.id === 1 || this.lastMpegAudioChunk.sn !== chunkMeta.sn;
      this.lastMpegAudioChunk = chunkMeta;
    }
    const fragStart = frag.start;
    const operation = {
      execute: () => {
        chunkStats.executeStart = self.performance.now();
        if (checkTimestampOffset) {
          const sb = this.sourceBuffer[type];
          if (sb) {
            const delta = fragStart - sb.timestampOffset;
            if (Math.abs(delta) >= 0.1) {
              logger.log(`[buffer-controller]: Updating audio SourceBuffer timestampOffset to ${fragStart} (delta: ${delta}) sn: ${frag.sn})`);
              sb.timestampOffset = fragStart;
            }
          }
        }
        this.appendExecutor(data, type);
      },
      onStart: () => {
        // logger.debug(`[buffer-controller]: ${type} SourceBuffer updatestart`);
      },
      onComplete: () => {
        // logger.debug(`[buffer-controller]: ${type} SourceBuffer updateend`);
        const end = self.performance.now();
        chunkStats.executeEnd = chunkStats.end = end;
        if (fragBuffering.first === 0) {
          fragBuffering.first = end;
        }
        if (partBuffering && partBuffering.first === 0) {
          partBuffering.first = end;
        }
        const {
          sourceBuffer
        } = this;
        const timeRanges = {};
        for (const type in sourceBuffer) {
          timeRanges[type] = BufferHelper.getBuffered(sourceBuffer[type]);
        }
        this.appendError = 0;
        this.hls.trigger(Events.BUFFER_APPENDED, {
          type,
          frag,
          part,
          chunkMeta,
          parent: frag.type,
          timeRanges
        });
      },
      onError: err => {
        // in case any error occured while appending, put back segment in segments table
        logger.error(`[buffer-controller]: Error encountered while trying to append to the ${type} SourceBuffer`, err);
        const event = {
          type: ErrorTypes.MEDIA_ERROR,
          parent: frag.type,
          details: ErrorDetails.BUFFER_APPEND_ERROR,
          frag,
          part,
          chunkMeta,
          error: err,
          err,
          fatal: false
        };
        if (err.code === DOMException.QUOTA_EXCEEDED_ERR) {
          // QuotaExceededError: http://www.w3.org/TR/html5/infrastructure.html#quotaexceedederror
          // let's stop appending any segments, and report BUFFER_FULL_ERROR error
          event.details = ErrorDetails.BUFFER_FULL_ERROR;
        } else {
          this.appendError++;
          event.details = ErrorDetails.BUFFER_APPEND_ERROR;
          /* with UHD content, we could get loop of quota exceeded error until
            browser is able to evict some data from sourcebuffer. Retrying can help recover.
          */
          if (this.appendError > hls.config.appendErrorMaxRetry) {
            logger.error(`[buffer-controller]: Failed ${hls.config.appendErrorMaxRetry} times to append segment in sourceBuffer`);
            event.fatal = true;
          }
        }
        hls.trigger(Events.ERROR, event);
      }
    };
    operationQueue.append(operation, type);
  }
  onBufferFlushing(event, data) {
    const {
      operationQueue
    } = this;
    const flushOperation = type => ({
      execute: this.removeExecutor.bind(this, type, data.startOffset, data.endOffset),
      onStart: () => {
        // logger.debug(`[buffer-controller]: Started flushing ${data.startOffset} -> ${data.endOffset} for ${type} Source Buffer`);
      },
      onComplete: () => {
        // logger.debug(`[buffer-controller]: Finished flushing ${data.startOffset} -> ${data.endOffset} for ${type} Source Buffer`);
        this.hls.trigger(Events.BUFFER_FLUSHED, {
          type
        });
      },
      onError: e => {
        logger.warn(`[buffer-controller]: Failed to remove from ${type} SourceBuffer`, e);
      }
    });
    if (data.type) {
      operationQueue.append(flushOperation(data.type), data.type);
    } else {
      this.getSourceBufferTypes().forEach(type => {
        operationQueue.append(flushOperation(type), type);
      });
    }
  }
  onFragParsed(event, data) {
    const {
      frag,
      part
    } = data;
    const buffersAppendedTo = [];
    const elementaryStreams = part ? part.elementaryStreams : frag.elementaryStreams;
    if (elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO]) {
      buffersAppendedTo.push('audiovideo');
    } else {
      if (elementaryStreams[ElementaryStreamTypes.AUDIO]) {
        buffersAppendedTo.push('audio');
      }
      if (elementaryStreams[ElementaryStreamTypes.VIDEO]) {
        buffersAppendedTo.push('video');
      }
    }
    const onUnblocked = () => {
      const now = self.performance.now();
      frag.stats.buffering.end = now;
      if (part) {
        part.stats.buffering.end = now;
      }
      const stats = part ? part.stats : frag.stats;
      this.hls.trigger(Events.FRAG_BUFFERED, {
        frag,
        part,
        stats,
        id: frag.type
      });
    };
    if (buffersAppendedTo.length === 0) {
      logger.warn(`Fragments must have at least one ElementaryStreamType set. type: ${frag.type} level: ${frag.level} sn: ${frag.sn}`);
    }
    this.blockBuffers(onUnblocked, buffersAppendedTo);
  }
  onFragChanged(event, data) {
    this.flushBackBuffer();
  }

  // on BUFFER_EOS mark matching sourcebuffer(s) as ended and trigger checkEos()
  // an undefined data.type will mark all buffers as EOS.
  onBufferEos(event, data) {
    const ended = this.getSourceBufferTypes().reduce((acc, type) => {
      const sb = this.sourceBuffer[type];
      if (sb && (!data.type || data.type === type)) {
        sb.ending = true;
        if (!sb.ended) {
          sb.ended = true;
          logger.log(`[buffer-controller]: ${type} sourceBuffer now EOS`);
        }
      }
      return acc && !!(!sb || sb.ended);
    }, true);
    if (ended) {
      logger.log(`[buffer-controller]: Queueing mediaSource.endOfStream()`);
      this.blockBuffers(() => {
        this.getSourceBufferTypes().forEach(type => {
          const sb = this.sourceBuffer[type];
          if (sb) {
            sb.ending = false;
          }
        });
        const {
          mediaSource
        } = this;
        if (!mediaSource || mediaSource.readyState !== 'open') {
          if (mediaSource) {
            logger.info(`[buffer-controller]: Could not call mediaSource.endOfStream(). mediaSource.readyState: ${mediaSource.readyState}`);
          }
          return;
        }
        logger.log(`[buffer-controller]: Calling mediaSource.endOfStream()`);
        // Allow this to throw and be caught by the enqueueing function
        mediaSource.endOfStream();
      });
    }
  }
  onLevelUpdated(event, {
    details
  }) {
    if (!details.fragments.length) {
      return;
    }
    this.details = details;
    if (this.getSourceBufferTypes().length) {
      this.blockBuffers(this.updateMediaElementDuration.bind(this));
    } else {
      this.updateMediaElementDuration();
    }
  }
  flushBackBuffer() {
    const {
      hls,
      details,
      media,
      sourceBuffer
    } = this;
    if (!media || details === null) {
      return;
    }
    const sourceBufferTypes = this.getSourceBufferTypes();
    if (!sourceBufferTypes.length) {
      return;
    }

    // Support for deprecated liveBackBufferLength
    const backBufferLength = details.live && hls.config.liveBackBufferLength !== null ? hls.config.liveBackBufferLength : hls.config.backBufferLength;
    if (!isFiniteNumber(backBufferLength) || backBufferLength < 0) {
      return;
    }
    const currentTime = media.currentTime;
    const targetDuration = details.levelTargetDuration;
    const maxBackBufferLength = Math.max(backBufferLength, targetDuration);
    const targetBackBufferPosition = Math.floor(currentTime / targetDuration) * targetDuration - maxBackBufferLength;
    sourceBufferTypes.forEach(type => {
      const sb = sourceBuffer[type];
      if (sb) {
        const buffered = BufferHelper.getBuffered(sb);
        // when target buffer start exceeds actual buffer start
        if (buffered.length > 0 && targetBackBufferPosition > buffered.start(0)) {
          hls.trigger(Events.BACK_BUFFER_REACHED, {
            bufferEnd: targetBackBufferPosition
          });

          // Support for deprecated event:
          if (details.live) {
            hls.trigger(Events.LIVE_BACK_BUFFER_REACHED, {
              bufferEnd: targetBackBufferPosition
            });
          } else if (sb.ended && buffered.end(buffered.length - 1) - currentTime < targetDuration * 2) {
            logger.info(`[buffer-controller]: Cannot flush ${type} back buffer while SourceBuffer is in ended state`);
            return;
          }
          hls.trigger(Events.BUFFER_FLUSHING, {
            startOffset: 0,
            endOffset: targetBackBufferPosition,
            type
          });
        }
      }
    });
  }

  /**
   * Update Media Source duration to current level duration or override to Infinity if configuration parameter
   * 'liveDurationInfinity` is set to `true`
   * More details: https://github.com/video-dev/hls.js/issues/355
   */
  updateMediaElementDuration() {
    if (!this.details || !this.media || !this.mediaSource || this.mediaSource.readyState !== 'open') {
      return;
    }
    const {
      details,
      hls,
      media,
      mediaSource
    } = this;
    const levelDuration = details.fragments[0].start + details.totalduration;
    const mediaDuration = media.duration;
    const msDuration = isFiniteNumber(mediaSource.duration) ? mediaSource.duration : 0;
    if (details.live && hls.config.liveDurationInfinity) {
      // Override duration to Infinity
      logger.log('[buffer-controller]: Media Source duration is set to Infinity');
      mediaSource.duration = Infinity;
      this.updateSeekableRange(details);
    } else if (levelDuration > msDuration && levelDuration > mediaDuration || !isFiniteNumber(mediaDuration)) {
      // levelDuration was the last value we set.
      // not using mediaSource.duration as the browser may tweak this value
      // only update Media Source duration if its value increase, this is to avoid
      // flushing already buffered portion when switching between quality level
      logger.log(`[buffer-controller]: Updating Media Source duration to ${levelDuration.toFixed(3)}`);
      mediaSource.duration = levelDuration;
    }
  }
  updateSeekableRange(levelDetails) {
    const mediaSource = this.mediaSource;
    const fragments = levelDetails.fragments;
    const len = fragments.length;
    if (len && levelDetails.live && mediaSource != null && mediaSource.setLiveSeekableRange) {
      const start = Math.max(0, fragments[0].start);
      const end = Math.max(start, start + levelDetails.totalduration);
      mediaSource.setLiveSeekableRange(start, end);
    }
  }
  checkPendingTracks() {
    const {
      bufferCodecEventsExpected,
      operationQueue,
      pendingTracks
    } = this;

    // Check if we've received all of the expected bufferCodec events. When none remain, create all the sourceBuffers at once.
    // This is important because the MSE spec allows implementations to throw QuotaExceededErrors if creating new sourceBuffers after
    // data has been appended to existing ones.
    // 2 tracks is the max (one for audio, one for video). If we've reach this max go ahead and create the buffers.
    const pendingTracksCount = Object.keys(pendingTracks).length;
    if (pendingTracksCount && !bufferCodecEventsExpected || pendingTracksCount === 2) {
      // ok, let's create them now !
      this.createSourceBuffers(pendingTracks);
      this.pendingTracks = {};
      // append any pending segments now !
      const buffers = this.getSourceBufferTypes();
      if (buffers.length) {
        this.hls.trigger(Events.BUFFER_CREATED, {
          tracks: this.tracks
        });
        buffers.forEach(type => {
          operationQueue.executeNext(type);
        });
      } else {
        const error = new Error('could not create source buffer for media codec(s)');
        this.hls.trigger(Events.ERROR, {
          type: ErrorTypes.MEDIA_ERROR,
          details: ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR,
          fatal: true,
          error,
          reason: error.message
        });
      }
    }
  }
  createSourceBuffers(tracks) {
    const {
      sourceBuffer,
      mediaSource
    } = this;
    if (!mediaSource) {
      throw Error('createSourceBuffers called when mediaSource was null');
    }
    for (const trackName in tracks) {
      if (!sourceBuffer[trackName]) {
        const track = tracks[trackName];
        if (!track) {
          throw Error(`source buffer exists for track ${trackName}, however track does not`);
        }
        // use levelCodec as first priority
        const codec = track.levelCodec || track.codec;
        const mimeType = `${track.container};codecs=${codec}`;
        logger.log(`[buffer-controller]: creating sourceBuffer(${mimeType})`);
        try {
          const sb = sourceBuffer[trackName] = mediaSource.addSourceBuffer(mimeType);
          const sbName = trackName;
          this.addBufferListener(sbName, 'updatestart', this._onSBUpdateStart);
          this.addBufferListener(sbName, 'updateend', this._onSBUpdateEnd);
          this.addBufferListener(sbName, 'error', this._onSBUpdateError);
          this.tracks[trackName] = {
            buffer: sb,
            codec: codec,
            container: track.container,
            levelCodec: track.levelCodec,
            metadata: track.metadata,
            id: track.id
          };
        } catch (err) {
          logger.error(`[buffer-controller]: error while trying to add sourceBuffer: ${err.message}`);
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.BUFFER_ADD_CODEC_ERROR,
            fatal: false,
            error: err,
            mimeType: mimeType
          });
        }
      }
    }
  }
  _onSBUpdateStart(type) {
    const {
      operationQueue
    } = this;
    const operation = operationQueue.current(type);
    operation.onStart();
  }
  _onSBUpdateEnd(type) {
    const {
      operationQueue
    } = this;
    const operation = operationQueue.current(type);
    operation.onComplete();
    operationQueue.shiftAndExecuteNext(type);
  }
  _onSBUpdateError(type, event) {
    const error = new Error(`${type} SourceBuffer error`);
    logger.error(`[buffer-controller]: ${error}`, event);
    // according to http://www.w3.org/TR/media-source/#sourcebuffer-append-error
    // SourceBuffer errors are not necessarily fatal; if so, the HTMLMediaElement will fire an error event
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.BUFFER_APPENDING_ERROR,
      error,
      fatal: false
    });
    // updateend is always fired after error, so we'll allow that to shift the current operation off of the queue
    const operation = this.operationQueue.current(type);
    if (operation) {
      operation.onError(event);
    }
  }

  // This method must result in an updateend event; if remove is not called, _onSBUpdateEnd must be called manually
  removeExecutor(type, startOffset, endOffset) {
    const {
      media,
      mediaSource,
      operationQueue,
      sourceBuffer
    } = this;
    const sb = sourceBuffer[type];
    if (!media || !mediaSource || !sb) {
      logger.warn(`[buffer-controller]: Attempting to remove from the ${type} SourceBuffer, but it does not exist`);
      operationQueue.shiftAndExecuteNext(type);
      return;
    }
    const mediaDuration = isFiniteNumber(media.duration) ? media.duration : Infinity;
    const msDuration = isFiniteNumber(mediaSource.duration) ? mediaSource.duration : Infinity;
    const removeStart = Math.max(0, startOffset);
    const removeEnd = Math.min(endOffset, mediaDuration, msDuration);
    if (removeEnd > removeStart && !sb.ending) {
      sb.ended = false;
      logger.log(`[buffer-controller]: Removing [${removeStart},${removeEnd}] from the ${type} SourceBuffer`);
      sb.remove(removeStart, removeEnd);
    } else {
      // Cycle the queue
      operationQueue.shiftAndExecuteNext(type);
    }
  }

  // This method must result in an updateend event; if append is not called, _onSBUpdateEnd must be called manually
  appendExecutor(data, type) {
    const {
      operationQueue,
      sourceBuffer
    } = this;
    const sb = sourceBuffer[type];
    if (!sb) {
      logger.warn(`[buffer-controller]: Attempting to append to the ${type} SourceBuffer, but it does not exist`);
      operationQueue.shiftAndExecuteNext(type);
      return;
    }
    sb.ended = false;
    sb.appendBuffer(data);
  }

  // Enqueues an operation to each SourceBuffer queue which, upon execution, resolves a promise. When all promises
  // resolve, the onUnblocked function is executed. Functions calling this method do not need to unblock the queue
  // upon completion, since we already do it here
  blockBuffers(onUnblocked, buffers = this.getSourceBufferTypes()) {
    if (!buffers.length) {
      logger.log('[buffer-controller]: Blocking operation requested, but no SourceBuffers exist');
      Promise.resolve().then(onUnblocked);
      return;
    }
    const {
      operationQueue
    } = this;

    // logger.debug(`[buffer-controller]: Blocking ${buffers} SourceBuffer`);
    const blockingOperations = buffers.map(type => operationQueue.appendBlocker(type));
    Promise.all(blockingOperations).then(() => {
      // logger.debug(`[buffer-controller]: Blocking operation resolved; unblocking ${buffers} SourceBuffer`);
      onUnblocked();
      buffers.forEach(type => {
        const sb = this.sourceBuffer[type];
        // Only cycle the queue if the SB is not updating. There's a bug in Chrome which sets the SB updating flag to
        // true when changing the MediaSource duration (https://bugs.chromium.org/p/chromium/issues/detail?id=959359&can=2&q=mediasource%20duration)
        // While this is a workaround, it's probably useful to have around
        if (!(sb != null && sb.updating)) {
          operationQueue.shiftAndExecuteNext(type);
        }
      });
    });
  }
  getSourceBufferTypes() {
    return Object.keys(this.sourceBuffer);
  }
  addBufferListener(type, event, fn) {
    const buffer = this.sourceBuffer[type];
    if (!buffer) {
      return;
    }
    const listener = fn.bind(this, type);
    this.listeners[type].push({
      event,
      listener
    });
    buffer.addEventListener(event, listener);
  }
  removeBufferListeners(type) {
    const buffer = this.sourceBuffer[type];
    if (!buffer) {
      return;
    }
    this.listeners[type].forEach(l => {
      buffer.removeEventListener(l.event, l.listener);
    });
  }
}

/**
 *
 * This code was ported from the dash.js project at:
 *   https://github.com/Dash-Industry-Forum/dash.js/blob/development/externals/cea608-parser.js
 *   https://github.com/Dash-Industry-Forum/dash.js/commit/8269b26a761e0853bb21d78780ed945144ecdd4d#diff-71bc295a2d6b6b7093a1d3290d53a4b2
 *
 * The original copyright appears below:
 *
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2015-2016, DASH Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  2. Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 *  Exceptions from regular ASCII. CodePoints are mapped to UTF-16 codes
 */

const specialCea608CharsCodes = {
  0x2a: 0xe1,
  // lowercase a, acute accent
  0x5c: 0xe9,
  // lowercase e, acute accent
  0x5e: 0xed,
  // lowercase i, acute accent
  0x5f: 0xf3,
  // lowercase o, acute accent
  0x60: 0xfa,
  // lowercase u, acute accent
  0x7b: 0xe7,
  // lowercase c with cedilla
  0x7c: 0xf7,
  // division symbol
  0x7d: 0xd1,
  // uppercase N tilde
  0x7e: 0xf1,
  // lowercase n tilde
  0x7f: 0x2588,
  // Full block
  // THIS BLOCK INCLUDES THE 16 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x11 AND LOW BETWEEN 0x30 AND 0x3F
  // THIS MEANS THAT \x50 MUST BE ADDED TO THE VALUES
  0x80: 0xae,
  // Registered symbol (R)
  0x81: 0xb0,
  // degree sign
  0x82: 0xbd,
  // 1/2 symbol
  0x83: 0xbf,
  // Inverted (open) question mark
  0x84: 0x2122,
  // Trademark symbol (TM)
  0x85: 0xa2,
  // Cents symbol
  0x86: 0xa3,
  // Pounds sterling
  0x87: 0x266a,
  // Music 8'th note
  0x88: 0xe0,
  // lowercase a, grave accent
  0x89: 0x20,
  // transparent space (regular)
  0x8a: 0xe8,
  // lowercase e, grave accent
  0x8b: 0xe2,
  // lowercase a, circumflex accent
  0x8c: 0xea,
  // lowercase e, circumflex accent
  0x8d: 0xee,
  // lowercase i, circumflex accent
  0x8e: 0xf4,
  // lowercase o, circumflex accent
  0x8f: 0xfb,
  // lowercase u, circumflex accent
  // THIS BLOCK INCLUDES THE 32 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x12 AND LOW BETWEEN 0x20 AND 0x3F
  0x90: 0xc1,
  // capital letter A with acute
  0x91: 0xc9,
  // capital letter E with acute
  0x92: 0xd3,
  // capital letter O with acute
  0x93: 0xda,
  // capital letter U with acute
  0x94: 0xdc,
  // capital letter U with diaresis
  0x95: 0xfc,
  // lowercase letter U with diaeresis
  0x96: 0x2018,
  // opening single quote
  0x97: 0xa1,
  // inverted exclamation mark
  0x98: 0x2a,
  // asterisk
  0x99: 0x2019,
  // closing single quote
  0x9a: 0x2501,
  // box drawings heavy horizontal
  0x9b: 0xa9,
  // copyright sign
  0x9c: 0x2120,
  // Service mark
  0x9d: 0x2022,
  // (round) bullet
  0x9e: 0x201c,
  // Left double quotation mark
  0x9f: 0x201d,
  // Right double quotation mark
  0xa0: 0xc0,
  // uppercase A, grave accent
  0xa1: 0xc2,
  // uppercase A, circumflex
  0xa2: 0xc7,
  // uppercase C with cedilla
  0xa3: 0xc8,
  // uppercase E, grave accent
  0xa4: 0xca,
  // uppercase E, circumflex
  0xa5: 0xcb,
  // capital letter E with diaresis
  0xa6: 0xeb,
  // lowercase letter e with diaresis
  0xa7: 0xce,
  // uppercase I, circumflex
  0xa8: 0xcf,
  // uppercase I, with diaresis
  0xa9: 0xef,
  // lowercase i, with diaresis
  0xaa: 0xd4,
  // uppercase O, circumflex
  0xab: 0xd9,
  // uppercase U, grave accent
  0xac: 0xf9,
  // lowercase u, grave accent
  0xad: 0xdb,
  // uppercase U, circumflex
  0xae: 0xab,
  // left-pointing double angle quotation mark
  0xaf: 0xbb,
  // right-pointing double angle quotation mark
  // THIS BLOCK INCLUDES THE 32 EXTENDED (TWO-BYTE) LINE 21 CHARACTERS
  // THAT COME FROM HI BYTE=0x13 AND LOW BETWEEN 0x20 AND 0x3F
  0xb0: 0xc3,
  // Uppercase A, tilde
  0xb1: 0xe3,
  // Lowercase a, tilde
  0xb2: 0xcd,
  // Uppercase I, acute accent
  0xb3: 0xcc,
  // Uppercase I, grave accent
  0xb4: 0xec,
  // Lowercase i, grave accent
  0xb5: 0xd2,
  // Uppercase O, grave accent
  0xb6: 0xf2,
  // Lowercase o, grave accent
  0xb7: 0xd5,
  // Uppercase O, tilde
  0xb8: 0xf5,
  // Lowercase o, tilde
  0xb9: 0x7b,
  // Open curly brace
  0xba: 0x7d,
  // Closing curly brace
  0xbb: 0x5c,
  // Backslash
  0xbc: 0x5e,
  // Caret
  0xbd: 0x5f,
  // Underscore
  0xbe: 0x7c,
  // Pipe (vertical line)
  0xbf: 0x223c,
  // Tilde operator
  0xc0: 0xc4,
  // Uppercase A, umlaut
  0xc1: 0xe4,
  // Lowercase A, umlaut
  0xc2: 0xd6,
  // Uppercase O, umlaut
  0xc3: 0xf6,
  // Lowercase o, umlaut
  0xc4: 0xdf,
  // Esszett (sharp S)
  0xc5: 0xa5,
  // Yen symbol
  0xc6: 0xa4,
  // Generic currency sign
  0xc7: 0x2503,
  // Box drawings heavy vertical
  0xc8: 0xc5,
  // Uppercase A, ring
  0xc9: 0xe5,
  // Lowercase A, ring
  0xca: 0xd8,
  // Uppercase O, stroke
  0xcb: 0xf8,
  // Lowercase o, strok
  0xcc: 0x250f,
  // Box drawings heavy down and right
  0xcd: 0x2513,
  // Box drawings heavy down and left
  0xce: 0x2517,
  // Box drawings heavy up and right
  0xcf: 0x251b // Box drawings heavy up and left
};

/**
 * Utils
 */
const getCharForByte = function getCharForByte(byte) {
  let charCode = byte;
  if (specialCea608CharsCodes.hasOwnProperty(byte)) {
    charCode = specialCea608CharsCodes[byte];
  }
  return String.fromCharCode(charCode);
};
const NR_ROWS = 15;
const NR_COLS = 100;
// Tables to look up row from PAC data
const rowsLowCh1 = {
  0x11: 1,
  0x12: 3,
  0x15: 5,
  0x16: 7,
  0x17: 9,
  0x10: 11,
  0x13: 12,
  0x14: 14
};
const rowsHighCh1 = {
  0x11: 2,
  0x12: 4,
  0x15: 6,
  0x16: 8,
  0x17: 10,
  0x13: 13,
  0x14: 15
};
const rowsLowCh2 = {
  0x19: 1,
  0x1a: 3,
  0x1d: 5,
  0x1e: 7,
  0x1f: 9,
  0x18: 11,
  0x1b: 12,
  0x1c: 14
};
const rowsHighCh2 = {
  0x19: 2,
  0x1a: 4,
  0x1d: 6,
  0x1e: 8,
  0x1f: 10,
  0x1b: 13,
  0x1c: 15
};
const backgroundColors = ['white', 'green', 'blue', 'cyan', 'red', 'yellow', 'magenta', 'black', 'transparent'];
class CaptionsLogger {
  constructor() {
    this.time = null;
    this.verboseLevel = 0;
  }
  log(severity, msg) {
    if (this.verboseLevel >= severity) {
      const m = typeof msg === 'function' ? msg() : msg;
      logger.log(`${this.time} [${severity}] ${m}`);
    }
  }
}
const numArrayToHexArray = function numArrayToHexArray(numArray) {
  const hexArray = [];
  for (let j = 0; j < numArray.length; j++) {
    hexArray.push(numArray[j].toString(16));
  }
  return hexArray;
};
class PenState {
  constructor(foreground, underline, italics, background, flash) {
    this.foreground = void 0;
    this.underline = void 0;
    this.italics = void 0;
    this.background = void 0;
    this.flash = void 0;
    this.foreground = foreground || 'white';
    this.underline = underline || false;
    this.italics = italics || false;
    this.background = background || 'black';
    this.flash = flash || false;
  }
  reset() {
    this.foreground = 'white';
    this.underline = false;
    this.italics = false;
    this.background = 'black';
    this.flash = false;
  }
  setStyles(styles) {
    const attribs = ['foreground', 'underline', 'italics', 'background', 'flash'];
    for (let i = 0; i < attribs.length; i++) {
      const style = attribs[i];
      if (styles.hasOwnProperty(style)) {
        this[style] = styles[style];
      }
    }
  }
  isDefault() {
    return this.foreground === 'white' && !this.underline && !this.italics && this.background === 'black' && !this.flash;
  }
  equals(other) {
    return this.foreground === other.foreground && this.underline === other.underline && this.italics === other.italics && this.background === other.background && this.flash === other.flash;
  }
  copy(newPenState) {
    this.foreground = newPenState.foreground;
    this.underline = newPenState.underline;
    this.italics = newPenState.italics;
    this.background = newPenState.background;
    this.flash = newPenState.flash;
  }
  toString() {
    return 'color=' + this.foreground + ', underline=' + this.underline + ', italics=' + this.italics + ', background=' + this.background + ', flash=' + this.flash;
  }
}

/**
 * Unicode character with styling and background.
 * @constructor
 */
class StyledUnicodeChar {
  constructor(uchar, foreground, underline, italics, background, flash) {
    this.uchar = void 0;
    this.penState = void 0;
    this.uchar = uchar || ' '; // unicode character
    this.penState = new PenState(foreground, underline, italics, background, flash);
  }
  reset() {
    this.uchar = ' ';
    this.penState.reset();
  }
  setChar(uchar, newPenState) {
    this.uchar = uchar;
    this.penState.copy(newPenState);
  }
  setPenState(newPenState) {
    this.penState.copy(newPenState);
  }
  equals(other) {
    return this.uchar === other.uchar && this.penState.equals(other.penState);
  }
  copy(newChar) {
    this.uchar = newChar.uchar;
    this.penState.copy(newChar.penState);
  }
  isEmpty() {
    return this.uchar === ' ' && this.penState.isDefault();
  }
}

/**
 * CEA-608 row consisting of NR_COLS instances of StyledUnicodeChar.
 * @constructor
 */
class Row {
  constructor(logger) {
    this.chars = void 0;
    this.pos = void 0;
    this.currPenState = void 0;
    this.cueStartTime = void 0;
    this.logger = void 0;
    this.chars = [];
    for (let i = 0; i < NR_COLS; i++) {
      this.chars.push(new StyledUnicodeChar());
    }
    this.logger = logger;
    this.pos = 0;
    this.currPenState = new PenState();
  }
  equals(other) {
    let equal = true;
    for (let i = 0; i < NR_COLS; i++) {
      if (!this.chars[i].equals(other.chars[i])) {
        equal = false;
        break;
      }
    }
    return equal;
  }
  copy(other) {
    for (let i = 0; i < NR_COLS; i++) {
      this.chars[i].copy(other.chars[i]);
    }
  }
  isEmpty() {
    let empty = true;
    for (let i = 0; i < NR_COLS; i++) {
      if (!this.chars[i].isEmpty()) {
        empty = false;
        break;
      }
    }
    return empty;
  }

  /**
   *  Set the cursor to a valid column.
   */
  setCursor(absPos) {
    if (this.pos !== absPos) {
      this.pos = absPos;
    }
    if (this.pos < 0) {
      this.logger.log(3, 'Negative cursor position ' + this.pos);
      this.pos = 0;
    } else if (this.pos > NR_COLS) {
      this.logger.log(3, 'Too large cursor position ' + this.pos);
      this.pos = NR_COLS;
    }
  }

  /**
   * Move the cursor relative to current position.
   */
  moveCursor(relPos) {
    const newPos = this.pos + relPos;
    if (relPos > 1) {
      for (let i = this.pos + 1; i < newPos + 1; i++) {
        this.chars[i].setPenState(this.currPenState);
      }
    }
    this.setCursor(newPos);
  }

  /**
   * Backspace, move one step back and clear character.
   */
  backSpace() {
    this.moveCursor(-1);
    this.chars[this.pos].setChar(' ', this.currPenState);
  }
  insertChar(byte) {
    if (byte >= 0x90) {
      // Extended char
      this.backSpace();
    }
    const char = getCharForByte(byte);
    if (this.pos >= NR_COLS) {
      this.logger.log(0, () => 'Cannot insert ' + byte.toString(16) + ' (' + char + ') at position ' + this.pos + '. Skipping it!');
      return;
    }
    this.chars[this.pos].setChar(char, this.currPenState);
    this.moveCursor(1);
  }
  clearFromPos(startPos) {
    let i;
    for (i = startPos; i < NR_COLS; i++) {
      this.chars[i].reset();
    }
  }
  clear() {
    this.clearFromPos(0);
    this.pos = 0;
    this.currPenState.reset();
  }
  clearToEndOfRow() {
    this.clearFromPos(this.pos);
  }
  getTextString() {
    const chars = [];
    let empty = true;
    for (let i = 0; i < NR_COLS; i++) {
      const char = this.chars[i].uchar;
      if (char !== ' ') {
        empty = false;
      }
      chars.push(char);
    }
    if (empty) {
      return '';
    } else {
      return chars.join('');
    }
  }
  setPenStyles(styles) {
    this.currPenState.setStyles(styles);
    const currChar = this.chars[this.pos];
    currChar.setPenState(this.currPenState);
  }
}

/**
 * Keep a CEA-608 screen of 32x15 styled characters
 * @constructor
 */
class CaptionScreen {
  constructor(logger) {
    this.rows = void 0;
    this.currRow = void 0;
    this.nrRollUpRows = void 0;
    this.lastOutputScreen = void 0;
    this.logger = void 0;
    this.rows = [];
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows.push(new Row(logger));
    } // Note that we use zero-based numbering (0-14)

    this.logger = logger;
    this.currRow = NR_ROWS - 1;
    this.nrRollUpRows = null;
    this.lastOutputScreen = null;
    this.reset();
  }
  reset() {
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows[i].clear();
    }
    this.currRow = NR_ROWS - 1;
  }
  equals(other) {
    let equal = true;
    for (let i = 0; i < NR_ROWS; i++) {
      if (!this.rows[i].equals(other.rows[i])) {
        equal = false;
        break;
      }
    }
    return equal;
  }
  copy(other) {
    for (let i = 0; i < NR_ROWS; i++) {
      this.rows[i].copy(other.rows[i]);
    }
  }
  isEmpty() {
    let empty = true;
    for (let i = 0; i < NR_ROWS; i++) {
      if (!this.rows[i].isEmpty()) {
        empty = false;
        break;
      }
    }
    return empty;
  }
  backSpace() {
    const row = this.rows[this.currRow];
    row.backSpace();
  }
  clearToEndOfRow() {
    const row = this.rows[this.currRow];
    row.clearToEndOfRow();
  }

  /**
   * Insert a character (without styling) in the current row.
   */
  insertChar(char) {
    const row = this.rows[this.currRow];
    row.insertChar(char);
  }
  setPen(styles) {
    const row = this.rows[this.currRow];
    row.setPenStyles(styles);
  }
  moveCursor(relPos) {
    const row = this.rows[this.currRow];
    row.moveCursor(relPos);
  }
  setCursor(absPos) {
    this.logger.log(2, 'setCursor: ' + absPos);
    const row = this.rows[this.currRow];
    row.setCursor(absPos);
  }
  setPAC(pacData) {
    this.logger.log(2, () => 'pacData = ' + JSON.stringify(pacData));
    let newRow = pacData.row - 1;
    if (this.nrRollUpRows && newRow < this.nrRollUpRows - 1) {
      newRow = this.nrRollUpRows - 1;
    }

    // Make sure this only affects Roll-up Captions by checking this.nrRollUpRows
    if (this.nrRollUpRows && this.currRow !== newRow) {
      // clear all rows first
      for (let i = 0; i < NR_ROWS; i++) {
        this.rows[i].clear();
      }

      // Copy this.nrRollUpRows rows from lastOutputScreen and place it in the newRow location
      // topRowIndex - the start of rows to copy (inclusive index)
      const topRowIndex = this.currRow + 1 - this.nrRollUpRows;
      // We only copy if the last position was already shown.
      // We use the cueStartTime value to check this.
      const lastOutputScreen = this.lastOutputScreen;
      if (lastOutputScreen) {
        const prevLineTime = lastOutputScreen.rows[topRowIndex].cueStartTime;
        const time = this.logger.time;
        if (prevLineTime && time !== null && prevLineTime < time) {
          for (let i = 0; i < this.nrRollUpRows; i++) {
            this.rows[newRow - this.nrRollUpRows + i + 1].copy(lastOutputScreen.rows[topRowIndex + i]);
          }
        }
      }
    }
    this.currRow = newRow;
    const row = this.rows[this.currRow];
    if (pacData.indent !== null) {
      const indent = pacData.indent;
      const prevPos = Math.max(indent - 1, 0);
      row.setCursor(pacData.indent);
      pacData.color = row.chars[prevPos].penState.foreground;
    }
    const styles = {
      foreground: pacData.color,
      underline: pacData.underline,
      italics: pacData.italics,
      background: 'black',
      flash: false
    };
    this.setPen(styles);
  }

  /**
   * Set background/extra foreground, but first do back_space, and then insert space (backwards compatibility).
   */
  setBkgData(bkgData) {
    this.logger.log(2, () => 'bkgData = ' + JSON.stringify(bkgData));
    this.backSpace();
    this.setPen(bkgData);
    this.insertChar(0x20); // Space
  }

  setRollUpRows(nrRows) {
    this.nrRollUpRows = nrRows;
  }
  rollUp() {
    if (this.nrRollUpRows === null) {
      this.logger.log(3, 'roll_up but nrRollUpRows not set yet');
      return; // Not properly setup
    }

    this.logger.log(1, () => this.getDisplayText());
    const topRowIndex = this.currRow + 1 - this.nrRollUpRows;
    const topRow = this.rows.splice(topRowIndex, 1)[0];
    topRow.clear();
    this.rows.splice(this.currRow, 0, topRow);
    this.logger.log(2, 'Rolling up');
    // this.logger.log(VerboseLevel.TEXT, this.get_display_text())
  }

  /**
   * Get all non-empty rows with as unicode text.
   */
  getDisplayText(asOneRow) {
    asOneRow = asOneRow || false;
    const displayText = [];
    let text = '';
    let rowNr = -1;
    for (let i = 0; i < NR_ROWS; i++) {
      const rowText = this.rows[i].getTextString();
      if (rowText) {
        rowNr = i + 1;
        if (asOneRow) {
          displayText.push('Row ' + rowNr + ": '" + rowText + "'");
        } else {
          displayText.push(rowText.trim());
        }
      }
    }
    if (displayText.length > 0) {
      if (asOneRow) {
        text = '[' + displayText.join(' | ') + ']';
      } else {
        text = displayText.join('\n');
      }
    }
    return text;
  }
  getTextAndFormat() {
    return this.rows;
  }
}

// var modes = ['MODE_ROLL-UP', 'MODE_POP-ON', 'MODE_PAINT-ON', 'MODE_TEXT'];

class Cea608Channel {
  constructor(channelNumber, outputFilter, logger) {
    this.chNr = void 0;
    this.outputFilter = void 0;
    this.mode = void 0;
    this.verbose = void 0;
    this.displayedMemory = void 0;
    this.nonDisplayedMemory = void 0;
    this.lastOutputScreen = void 0;
    this.currRollUpRow = void 0;
    this.writeScreen = void 0;
    this.cueStartTime = void 0;
    this.logger = void 0;
    this.chNr = channelNumber;
    this.outputFilter = outputFilter;
    this.mode = null;
    this.verbose = 0;
    this.displayedMemory = new CaptionScreen(logger);
    this.nonDisplayedMemory = new CaptionScreen(logger);
    this.lastOutputScreen = new CaptionScreen(logger);
    this.currRollUpRow = this.displayedMemory.rows[NR_ROWS - 1];
    this.writeScreen = this.displayedMemory;
    this.mode = null;
    this.cueStartTime = null; // Keeps track of where a cue started.
    this.logger = logger;
  }
  reset() {
    this.mode = null;
    this.displayedMemory.reset();
    this.nonDisplayedMemory.reset();
    this.lastOutputScreen.reset();
    this.outputFilter.reset();
    this.currRollUpRow = this.displayedMemory.rows[NR_ROWS - 1];
    this.writeScreen = this.displayedMemory;
    this.mode = null;
    this.cueStartTime = null;
  }
  getHandler() {
    return this.outputFilter;
  }
  setHandler(newHandler) {
    this.outputFilter = newHandler;
  }
  setPAC(pacData) {
    this.writeScreen.setPAC(pacData);
  }
  setBkgData(bkgData) {
    this.writeScreen.setBkgData(bkgData);
  }
  setMode(newMode) {
    if (newMode === this.mode) {
      return;
    }
    this.mode = newMode;
    this.logger.log(2, () => 'MODE=' + newMode);
    if (this.mode === 'MODE_POP-ON') {
      this.writeScreen = this.nonDisplayedMemory;
    } else {
      this.writeScreen = this.displayedMemory;
      this.writeScreen.reset();
    }
    if (this.mode !== 'MODE_ROLL-UP') {
      this.displayedMemory.nrRollUpRows = null;
      this.nonDisplayedMemory.nrRollUpRows = null;
    }
    this.mode = newMode;
  }
  insertChars(chars) {
    for (let i = 0; i < chars.length; i++) {
      this.writeScreen.insertChar(chars[i]);
    }
    const screen = this.writeScreen === this.displayedMemory ? 'DISP' : 'NON_DISP';
    this.logger.log(2, () => screen + ': ' + this.writeScreen.getDisplayText(true));
    if (this.mode === 'MODE_PAINT-ON' || this.mode === 'MODE_ROLL-UP') {
      this.logger.log(1, () => 'DISPLAYED: ' + this.displayedMemory.getDisplayText(true));
      this.outputDataUpdate();
    }
  }
  ccRCL() {
    // Resume Caption Loading (switch mode to Pop On)
    this.logger.log(2, 'RCL - Resume Caption Loading');
    this.setMode('MODE_POP-ON');
  }
  ccBS() {
    // BackSpace
    this.logger.log(2, 'BS - BackSpace');
    if (this.mode === 'MODE_TEXT') {
      return;
    }
    this.writeScreen.backSpace();
    if (this.writeScreen === this.displayedMemory) {
      this.outputDataUpdate();
    }
  }
  ccAOF() {
    // Reserved (formerly Alarm Off)
  }
  ccAON() {
    // Reserved (formerly Alarm On)
  }
  ccDER() {
    // Delete to End of Row
    this.logger.log(2, 'DER- Delete to End of Row');
    this.writeScreen.clearToEndOfRow();
    this.outputDataUpdate();
  }
  ccRU(nrRows) {
    // Roll-Up Captions-2,3,or 4 Rows
    this.logger.log(2, 'RU(' + nrRows + ') - Roll Up');
    this.writeScreen = this.displayedMemory;
    this.setMode('MODE_ROLL-UP');
    this.writeScreen.setRollUpRows(nrRows);
  }
  ccFON() {
    // Flash On
    this.logger.log(2, 'FON - Flash On');
    this.writeScreen.setPen({
      flash: true
    });
  }
  ccRDC() {
    // Resume Direct Captioning (switch mode to PaintOn)
    this.logger.log(2, 'RDC - Resume Direct Captioning');
    this.setMode('MODE_PAINT-ON');
  }
  ccTR() {
    // Text Restart in text mode (not supported, however)
    this.logger.log(2, 'TR');
    this.setMode('MODE_TEXT');
  }
  ccRTD() {
    // Resume Text Display in Text mode (not supported, however)
    this.logger.log(2, 'RTD');
    this.setMode('MODE_TEXT');
  }
  ccEDM() {
    // Erase Displayed Memory
    this.logger.log(2, 'EDM - Erase Displayed Memory');
    this.displayedMemory.reset();
    this.outputDataUpdate(true);
  }
  ccCR() {
    // Carriage Return
    this.logger.log(2, 'CR - Carriage Return');
    this.writeScreen.rollUp();
    this.outputDataUpdate(true);
  }
  ccENM() {
    // Erase Non-Displayed Memory
    this.logger.log(2, 'ENM - Erase Non-displayed Memory');
    this.nonDisplayedMemory.reset();
  }
  ccEOC() {
    // End of Caption (Flip Memories)
    this.logger.log(2, 'EOC - End Of Caption');
    if (this.mode === 'MODE_POP-ON') {
      const tmp = this.displayedMemory;
      this.displayedMemory = this.nonDisplayedMemory;
      this.nonDisplayedMemory = tmp;
      this.writeScreen = this.nonDisplayedMemory;
      this.logger.log(1, () => 'DISP: ' + this.displayedMemory.getDisplayText());
    }
    this.outputDataUpdate(true);
  }
  ccTO(nrCols) {
    // Tab Offset 1,2, or 3 columns
    this.logger.log(2, 'TO(' + nrCols + ') - Tab Offset');
    this.writeScreen.moveCursor(nrCols);
  }
  ccMIDROW(secondByte) {
    // Parse MIDROW command
    const styles = {
      flash: false
    };
    styles.underline = secondByte % 2 === 1;
    styles.italics = secondByte >= 0x2e;
    if (!styles.italics) {
      const colorIndex = Math.floor(secondByte / 2) - 0x10;
      const colors = ['white', 'green', 'blue', 'cyan', 'red', 'yellow', 'magenta'];
      styles.foreground = colors[colorIndex];
    } else {
      styles.foreground = 'white';
    }
    this.logger.log(2, 'MIDROW: ' + JSON.stringify(styles));
    this.writeScreen.setPen(styles);
  }
  outputDataUpdate(dispatch = false) {
    const time = this.logger.time;
    if (time === null) {
      return;
    }
    if (this.outputFilter) {
      if (this.cueStartTime === null && !this.displayedMemory.isEmpty()) {
        // Start of a new cue
        this.cueStartTime = time;
      } else {
        if (!this.displayedMemory.equals(this.lastOutputScreen)) {
          this.outputFilter.newCue(this.cueStartTime, time, this.lastOutputScreen);
          if (dispatch && this.outputFilter.dispatchCue) {
            this.outputFilter.dispatchCue();
          }
          this.cueStartTime = this.displayedMemory.isEmpty() ? null : time;
        }
      }
      this.lastOutputScreen.copy(this.displayedMemory);
    }
  }
  cueSplitAtTime(t) {
    if (this.outputFilter) {
      if (!this.displayedMemory.isEmpty()) {
        if (this.outputFilter.newCue) {
          this.outputFilter.newCue(this.cueStartTime, t, this.displayedMemory);
        }
        this.cueStartTime = t;
      }
    }
  }
}

// Will be 1 or 2 when parsing captions

class Cea608Parser {
  constructor(field, out1, out2) {
    this.channels = void 0;
    this.currentChannel = 0;
    this.cmdHistory = void 0;
    this.logger = void 0;
    const logger = new CaptionsLogger();
    this.channels = [null, new Cea608Channel(field, out1, logger), new Cea608Channel(field + 1, out2, logger)];
    this.cmdHistory = createCmdHistory();
    this.logger = logger;
  }
  getHandler(channel) {
    return this.channels[channel].getHandler();
  }
  setHandler(channel, newHandler) {
    this.channels[channel].setHandler(newHandler);
  }

  /**
   * Add data for time t in forms of list of bytes (unsigned ints). The bytes are treated as pairs.
   */
  addData(time, byteList) {
    let cmdFound;
    let a;
    let b;
    let charsFound = false;
    this.logger.time = time;
    for (let i = 0; i < byteList.length; i += 2) {
      a = byteList[i] & 0x7f;
      b = byteList[i + 1] & 0x7f;
      if (a === 0 && b === 0) {
        continue;
      } else {
        this.logger.log(3, '[' + numArrayToHexArray([byteList[i], byteList[i + 1]]) + '] -> (' + numArrayToHexArray([a, b]) + ')');
      }
      cmdFound = this.parseCmd(a, b);
      if (!cmdFound) {
        cmdFound = this.parseMidrow(a, b);
      }
      if (!cmdFound) {
        cmdFound = this.parsePAC(a, b);
      }
      if (!cmdFound) {
        cmdFound = this.parseBackgroundAttributes(a, b);
      }
      if (!cmdFound) {
        charsFound = this.parseChars(a, b);
        if (charsFound) {
          const currChNr = this.currentChannel;
          if (currChNr && currChNr > 0) {
            const channel = this.channels[currChNr];
            channel.insertChars(charsFound);
          } else {
            this.logger.log(2, 'No channel found yet. TEXT-MODE?');
          }
        }
      }
      if (!cmdFound && !charsFound) {
        this.logger.log(2, "Couldn't parse cleaned data " + numArrayToHexArray([a, b]) + ' orig: ' + numArrayToHexArray([byteList[i], byteList[i + 1]]));
      }
    }
  }

  /**
   * Parse Command.
   * @returns True if a command was found
   */
  parseCmd(a, b) {
    const {
      cmdHistory
    } = this;
    const cond1 = (a === 0x14 || a === 0x1c || a === 0x15 || a === 0x1d) && b >= 0x20 && b <= 0x2f;
    const cond2 = (a === 0x17 || a === 0x1f) && b >= 0x21 && b <= 0x23;
    if (!(cond1 || cond2)) {
      return false;
    }
    if (hasCmdRepeated(a, b, cmdHistory)) {
      setLastCmd(null, null, cmdHistory);
      this.logger.log(3, 'Repeated command (' + numArrayToHexArray([a, b]) + ') is dropped');
      return true;
    }
    const chNr = a === 0x14 || a === 0x15 || a === 0x17 ? 1 : 2;
    const channel = this.channels[chNr];
    if (a === 0x14 || a === 0x15 || a === 0x1c || a === 0x1d) {
      if (b === 0x20) {
        channel.ccRCL();
      } else if (b === 0x21) {
        channel.ccBS();
      } else if (b === 0x22) {
        channel.ccAOF();
      } else if (b === 0x23) {
        channel.ccAON();
      } else if (b === 0x24) {
        channel.ccDER();
      } else if (b === 0x25) {
        channel.ccRU(2);
      } else if (b === 0x26) {
        channel.ccRU(3);
      } else if (b === 0x27) {
        channel.ccRU(4);
      } else if (b === 0x28) {
        channel.ccFON();
      } else if (b === 0x29) {
        channel.ccRDC();
      } else if (b === 0x2a) {
        channel.ccTR();
      } else if (b === 0x2b) {
        channel.ccRTD();
      } else if (b === 0x2c) {
        channel.ccEDM();
      } else if (b === 0x2d) {
        channel.ccCR();
      } else if (b === 0x2e) {
        channel.ccENM();
      } else if (b === 0x2f) {
        channel.ccEOC();
      }
    } else {
      // a == 0x17 || a == 0x1F
      channel.ccTO(b - 0x20);
    }
    setLastCmd(a, b, cmdHistory);
    this.currentChannel = chNr;
    return true;
  }

  /**
   * Parse midrow styling command
   */
  parseMidrow(a, b) {
    let chNr = 0;
    if ((a === 0x11 || a === 0x19) && b >= 0x20 && b <= 0x2f) {
      if (a === 0x11) {
        chNr = 1;
      } else {
        chNr = 2;
      }
      if (chNr !== this.currentChannel) {
        this.logger.log(0, 'Mismatch channel in midrow parsing');
        return false;
      }
      const channel = this.channels[chNr];
      if (!channel) {
        return false;
      }
      channel.ccMIDROW(b);
      this.logger.log(3, 'MIDROW (' + numArrayToHexArray([a, b]) + ')');
      return true;
    }
    return false;
  }

  /**
   * Parse Preable Access Codes (Table 53).
   * @returns {Boolean} Tells if PAC found
   */
  parsePAC(a, b) {
    let row;
    const cmdHistory = this.cmdHistory;
    const case1 = (a >= 0x11 && a <= 0x17 || a >= 0x19 && a <= 0x1f) && b >= 0x40 && b <= 0x7f;
    const case2 = (a === 0x10 || a === 0x18) && b >= 0x40 && b <= 0x5f;
    if (!(case1 || case2)) {
      return false;
    }
    if (hasCmdRepeated(a, b, cmdHistory)) {
      setLastCmd(null, null, cmdHistory);
      return true; // Repeated commands are dropped (once)
    }

    const chNr = a <= 0x17 ? 1 : 2;
    if (b >= 0x40 && b <= 0x5f) {
      row = chNr === 1 ? rowsLowCh1[a] : rowsLowCh2[a];
    } else {
      // 0x60 <= b <= 0x7F
      row = chNr === 1 ? rowsHighCh1[a] : rowsHighCh2[a];
    }
    const channel = this.channels[chNr];
    if (!channel) {
      return false;
    }
    channel.setPAC(this.interpretPAC(row, b));
    setLastCmd(a, b, cmdHistory);
    this.currentChannel = chNr;
    return true;
  }

  /**
   * Interpret the second byte of the pac, and return the information.
   * @returns pacData with style parameters
   */
  interpretPAC(row, byte) {
    let pacIndex;
    const pacData = {
      color: null,
      italics: false,
      indent: null,
      underline: false,
      row: row
    };
    if (byte > 0x5f) {
      pacIndex = byte - 0x60;
    } else {
      pacIndex = byte - 0x40;
    }
    pacData.underline = (pacIndex & 1) === 1;
    if (pacIndex <= 0xd) {
      pacData.color = ['white', 'green', 'blue', 'cyan', 'red', 'yellow', 'magenta', 'white'][Math.floor(pacIndex / 2)];
    } else if (pacIndex <= 0xf) {
      pacData.italics = true;
      pacData.color = 'white';
    } else {
      pacData.indent = Math.floor((pacIndex - 0x10) / 2) * 4;
    }
    return pacData; // Note that row has zero offset. The spec uses 1.
  }

  /**
   * Parse characters.
   * @returns An array with 1 to 2 codes corresponding to chars, if found. null otherwise.
   */
  parseChars(a, b) {
    let channelNr;
    let charCodes = null;
    let charCode1 = null;
    if (a >= 0x19) {
      channelNr = 2;
      charCode1 = a - 8;
    } else {
      channelNr = 1;
      charCode1 = a;
    }
    if (charCode1 >= 0x11 && charCode1 <= 0x13) {
      // Special character
      let oneCode;
      if (charCode1 === 0x11) {
        oneCode = b + 0x50;
      } else if (charCode1 === 0x12) {
        oneCode = b + 0x70;
      } else {
        oneCode = b + 0x90;
      }
      this.logger.log(2, "Special char '" + getCharForByte(oneCode) + "' in channel " + channelNr);
      charCodes = [oneCode];
    } else if (a >= 0x20 && a <= 0x7f) {
      charCodes = b === 0 ? [a] : [a, b];
    }
    if (charCodes) {
      const hexCodes = numArrayToHexArray(charCodes);
      this.logger.log(3, 'Char codes =  ' + hexCodes.join(','));
      setLastCmd(a, b, this.cmdHistory);
    }
    return charCodes;
  }

  /**
   * Parse extended background attributes as well as new foreground color black.
   * @returns True if background attributes are found
   */
  parseBackgroundAttributes(a, b) {
    const case1 = (a === 0x10 || a === 0x18) && b >= 0x20 && b <= 0x2f;
    const case2 = (a === 0x17 || a === 0x1f) && b >= 0x2d && b <= 0x2f;
    if (!(case1 || case2)) {
      return false;
    }
    let index;
    const bkgData = {};
    if (a === 0x10 || a === 0x18) {
      index = Math.floor((b - 0x20) / 2);
      bkgData.background = backgroundColors[index];
      if (b % 2 === 1) {
        bkgData.background = bkgData.background + '_semi';
      }
    } else if (b === 0x2d) {
      bkgData.background = 'transparent';
    } else {
      bkgData.foreground = 'black';
      if (b === 0x2f) {
        bkgData.underline = true;
      }
    }
    const chNr = a <= 0x17 ? 1 : 2;
    const channel = this.channels[chNr];
    channel.setBkgData(bkgData);
    setLastCmd(a, b, this.cmdHistory);
    return true;
  }

  /**
   * Reset state of parser and its channels.
   */
  reset() {
    for (let i = 0; i < Object.keys(this.channels).length; i++) {
      const channel = this.channels[i];
      if (channel) {
        channel.reset();
      }
    }
    this.cmdHistory = createCmdHistory();
  }

  /**
   * Trigger the generation of a cue, and the start of a new one if displayScreens are not empty.
   */
  cueSplitAtTime(t) {
    for (let i = 0; i < this.channels.length; i++) {
      const channel = this.channels[i];
      if (channel) {
        channel.cueSplitAtTime(t);
      }
    }
  }
}
function setLastCmd(a, b, cmdHistory) {
  cmdHistory.a = a;
  cmdHistory.b = b;
}
function hasCmdRepeated(a, b, cmdHistory) {
  return cmdHistory.a === a && cmdHistory.b === b;
}
function createCmdHistory() {
  return {
    a: null,
    b: null
  };
}

class OutputFilter {
  constructor(timelineController, trackName) {
    this.timelineController = void 0;
    this.cueRanges = [];
    this.trackName = void 0;
    this.startTime = null;
    this.endTime = null;
    this.screen = null;
    this.timelineController = timelineController;
    this.trackName = trackName;
  }
  dispatchCue() {
    if (this.startTime === null) {
      return;
    }
    this.timelineController.addCues(this.trackName, this.startTime, this.endTime, this.screen, this.cueRanges);
    this.startTime = null;
  }
  newCue(startTime, endTime, screen) {
    if (this.startTime === null || this.startTime > startTime) {
      this.startTime = startTime;
    }
    this.endTime = endTime;
    this.screen = screen;
    this.timelineController.createCaptionsTrack(this.trackName);
  }
  reset() {
    this.cueRanges = [];
    this.startTime = null;
  }
}

/**
 * Copyright 2013 vtt.js Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var VTTCue = (function () {
  if (typeof self !== 'undefined' && self.VTTCue) {
    return self.VTTCue;
  }
  const AllowedDirections = ['', 'lr', 'rl'];
  const AllowedAlignments = ['start', 'middle', 'end', 'left', 'right'];
  function isAllowedValue(allowed, value) {
    if (typeof value !== 'string') {
      return false;
    }
    // necessary for assuring the generic conforms to the Array interface
    if (!Array.isArray(allowed)) {
      return false;
    }
    // reset the type so that the next narrowing works well
    const lcValue = value.toLowerCase();
    // use the allow list to narrow the type to a specific subset of strings
    if (~allowed.indexOf(lcValue)) {
      return lcValue;
    }
    return false;
  }
  function findDirectionSetting(value) {
    return isAllowedValue(AllowedDirections, value);
  }
  function findAlignSetting(value) {
    return isAllowedValue(AllowedAlignments, value);
  }
  function extend(obj, ...rest) {
    let i = 1;
    for (; i < arguments.length; i++) {
      const cobj = arguments[i];
      for (const p in cobj) {
        obj[p] = cobj[p];
      }
    }
    return obj;
  }
  function VTTCue(startTime, endTime, text) {
    const cue = this;
    const baseObj = {
      enumerable: true
    };
    /**
     * Shim implementation specific properties. These properties are not in
     * the spec.
     */

    // Lets us know when the VTTCue's data has changed in such a way that we need
    // to recompute its display state. This lets us compute its display state
    // lazily.
    cue.hasBeenReset = false;

    /**
     * VTTCue and TextTrackCue properties
     * http://dev.w3.org/html5/webvtt/#vttcue-interface
     */

    let _id = '';
    let _pauseOnExit = false;
    let _startTime = startTime;
    let _endTime = endTime;
    let _text = text;
    let _region = null;
    let _vertical = '';
    let _snapToLines = true;
    let _line = 'auto';
    let _lineAlign = 'start';
    let _position = 50;
    let _positionAlign = 'middle';
    let _size = 50;
    let _align = 'middle';
    Object.defineProperty(cue, 'id', extend({}, baseObj, {
      get: function () {
        return _id;
      },
      set: function (value) {
        _id = '' + value;
      }
    }));
    Object.defineProperty(cue, 'pauseOnExit', extend({}, baseObj, {
      get: function () {
        return _pauseOnExit;
      },
      set: function (value) {
        _pauseOnExit = !!value;
      }
    }));
    Object.defineProperty(cue, 'startTime', extend({}, baseObj, {
      get: function () {
        return _startTime;
      },
      set: function (value) {
        if (typeof value !== 'number') {
          throw new TypeError('Start time must be set to a number.');
        }
        _startTime = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'endTime', extend({}, baseObj, {
      get: function () {
        return _endTime;
      },
      set: function (value) {
        if (typeof value !== 'number') {
          throw new TypeError('End time must be set to a number.');
        }
        _endTime = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'text', extend({}, baseObj, {
      get: function () {
        return _text;
      },
      set: function (value) {
        _text = '' + value;
        this.hasBeenReset = true;
      }
    }));

    // todo: implement VTTRegion polyfill?
    Object.defineProperty(cue, 'region', extend({}, baseObj, {
      get: function () {
        return _region;
      },
      set: function (value) {
        _region = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'vertical', extend({}, baseObj, {
      get: function () {
        return _vertical;
      },
      set: function (value) {
        const setting = findDirectionSetting(value);
        // Have to check for false because the setting an be an empty string.
        if (setting === false) {
          throw new SyntaxError('An invalid or illegal string was specified.');
        }
        _vertical = setting;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'snapToLines', extend({}, baseObj, {
      get: function () {
        return _snapToLines;
      },
      set: function (value) {
        _snapToLines = !!value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'line', extend({}, baseObj, {
      get: function () {
        return _line;
      },
      set: function (value) {
        if (typeof value !== 'number' && value !== 'auto') {
          throw new SyntaxError('An invalid number or illegal string was specified.');
        }
        _line = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'lineAlign', extend({}, baseObj, {
      get: function () {
        return _lineAlign;
      },
      set: function (value) {
        const setting = findAlignSetting(value);
        if (!setting) {
          throw new SyntaxError('An invalid or illegal string was specified.');
        }
        _lineAlign = setting;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'position', extend({}, baseObj, {
      get: function () {
        return _position;
      },
      set: function (value) {
        if (value < 0 || value > 100) {
          throw new Error('Position must be between 0 and 100.');
        }
        _position = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'positionAlign', extend({}, baseObj, {
      get: function () {
        return _positionAlign;
      },
      set: function (value) {
        const setting = findAlignSetting(value);
        if (!setting) {
          throw new SyntaxError('An invalid or illegal string was specified.');
        }
        _positionAlign = setting;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'size', extend({}, baseObj, {
      get: function () {
        return _size;
      },
      set: function (value) {
        if (value < 0 || value > 100) {
          throw new Error('Size must be between 0 and 100.');
        }
        _size = value;
        this.hasBeenReset = true;
      }
    }));
    Object.defineProperty(cue, 'align', extend({}, baseObj, {
      get: function () {
        return _align;
      },
      set: function (value) {
        const setting = findAlignSetting(value);
        if (!setting) {
          throw new SyntaxError('An invalid or illegal string was specified.');
        }
        _align = setting;
        this.hasBeenReset = true;
      }
    }));

    /**
     * Other <track> spec defined properties
     */

    // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-video-element.html#text-track-cue-display-state
    cue.displayState = undefined;
  }

  /**
   * VTTCue methods
   */

  VTTCue.prototype.getCueAsHTML = function () {
    // Assume WebVTT.convertCueToDOMTree is on the global.
    const WebVTT = self.WebVTT;
    return WebVTT.convertCueToDOMTree(self, this.text);
  };
  // this is a polyfill hack
  return VTTCue;
})();

/*
 * Source: https://github.com/mozilla/vtt.js/blob/master/dist/vtt.js
 */

class StringDecoder {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decode(data, options) {
    if (!data) {
      return '';
    }
    if (typeof data !== 'string') {
      throw new Error('Error - expected string data.');
    }
    return decodeURIComponent(encodeURIComponent(data));
  }
}

// Try to parse input as a time stamp.
function parseTimeStamp(input) {
  function computeSeconds(h, m, s, f) {
    return (h | 0) * 3600 + (m | 0) * 60 + (s | 0) + parseFloat(f || 0);
  }
  const m = input.match(/^(?:(\d+):)?(\d{2}):(\d{2})(\.\d+)?/);
  if (!m) {
    return null;
  }
  if (parseFloat(m[2]) > 59) {
    // Timestamp takes the form of [hours]:[minutes].[milliseconds]
    // First position is hours as it's over 59.
    return computeSeconds(m[2], m[3], 0, m[4]);
  }
  // Timestamp takes the form of [hours (optional)]:[minutes]:[seconds].[milliseconds]
  return computeSeconds(m[1], m[2], m[3], m[4]);
}

// A settings object holds key/value pairs and will ignore anything but the first
// assignment to a specific key.
class Settings {
  constructor() {
    this.values = Object.create(null);
  }
  // Only accept the first assignment to any key.
  set(k, v) {
    if (!this.get(k) && v !== '') {
      this.values[k] = v;
    }
  }
  // Return the value for a key, or a default value.
  // If 'defaultKey' is passed then 'dflt' is assumed to be an object with
  // a number of possible default values as properties where 'defaultKey' is
  // the key of the property that will be chosen; otherwise it's assumed to be
  // a single value.
  get(k, dflt, defaultKey) {
    if (defaultKey) {
      return this.has(k) ? this.values[k] : dflt[defaultKey];
    }
    return this.has(k) ? this.values[k] : dflt;
  }
  // Check whether we have a value for a key.
  has(k) {
    return k in this.values;
  }
  // Accept a setting if its one of the given alternatives.
  alt(k, v, a) {
    for (let n = 0; n < a.length; ++n) {
      if (v === a[n]) {
        this.set(k, v);
        break;
      }
    }
  }
  // Accept a setting if its a valid (signed) integer.
  integer(k, v) {
    if (/^-?\d+$/.test(v)) {
      // integer
      this.set(k, parseInt(v, 10));
    }
  }
  // Accept a setting if its a valid percentage.
  percent(k, v) {
    if (/^([\d]{1,3})(\.[\d]*)?%$/.test(v)) {
      const percent = parseFloat(v);
      if (percent >= 0 && percent <= 100) {
        this.set(k, percent);
        return true;
      }
    }
    return false;
  }
}

// Helper function to parse input into groups separated by 'groupDelim', and
// interpret each group as a key/value pair separated by 'keyValueDelim'.
function parseOptions(input, callback, keyValueDelim, groupDelim) {
  const groups = groupDelim ? input.split(groupDelim) : [input];
  for (const i in groups) {
    if (typeof groups[i] !== 'string') {
      continue;
    }
    const kv = groups[i].split(keyValueDelim);
    if (kv.length !== 2) {
      continue;
    }
    const k = kv[0];
    const v = kv[1];
    callback(k, v);
  }
}
const defaults = new VTTCue(0, 0, '');
// 'middle' was changed to 'center' in the spec: https://github.com/w3c/webvtt/pull/244
//  Safari doesn't yet support this change, but FF and Chrome do.
const center = defaults.align === 'middle' ? 'middle' : 'center';
function parseCue(input, cue, regionList) {
  // Remember the original input if we need to throw an error.
  const oInput = input;
  // 4.1 WebVTT timestamp
  function consumeTimeStamp() {
    const ts = parseTimeStamp(input);
    if (ts === null) {
      throw new Error('Malformed timestamp: ' + oInput);
    }

    // Remove time stamp from input.
    input = input.replace(/^[^\sa-zA-Z-]+/, '');
    return ts;
  }

  // 4.4.2 WebVTT cue settings
  function consumeCueSettings(input, cue) {
    const settings = new Settings();
    parseOptions(input, function (k, v) {
      let vals;
      switch (k) {
        case 'region':
          // Find the last region we parsed with the same region id.
          for (let i = regionList.length - 1; i >= 0; i--) {
            if (regionList[i].id === v) {
              settings.set(k, regionList[i].region);
              break;
            }
          }
          break;
        case 'vertical':
          settings.alt(k, v, ['rl', 'lr']);
          break;
        case 'line':
          vals = v.split(',');
          settings.integer(k, vals[0]);
          if (settings.percent(k, vals[0])) {
            settings.set('snapToLines', false);
          }
          settings.alt(k, vals[0], ['auto']);
          if (vals.length === 2) {
            settings.alt('lineAlign', vals[1], ['start', center, 'end']);
          }
          break;
        case 'position':
          vals = v.split(',');
          settings.percent(k, vals[0]);
          if (vals.length === 2) {
            settings.alt('positionAlign', vals[1], ['start', center, 'end', 'line-left', 'line-right', 'auto']);
          }
          break;
        case 'size':
          settings.percent(k, v);
          break;
        case 'align':
          settings.alt(k, v, ['start', center, 'end', 'left', 'right']);
          break;
      }
    }, /:/, /\s/);

    // Apply default values for any missing fields.
    cue.region = settings.get('region', null);
    cue.vertical = settings.get('vertical', '');
    let line = settings.get('line', 'auto');
    if (line === 'auto' && defaults.line === -1) {
      // set numeric line number for Safari
      line = -1;
    }
    cue.line = line;
    cue.lineAlign = settings.get('lineAlign', 'start');
    cue.snapToLines = settings.get('snapToLines', true);
    cue.size = settings.get('size', 100);
    cue.align = settings.get('align', center);
    let position = settings.get('position', 'auto');
    if (position === 'auto' && defaults.position === 50) {
      // set numeric position for Safari
      position = cue.align === 'start' || cue.align === 'left' ? 0 : cue.align === 'end' || cue.align === 'right' ? 100 : 50;
    }
    cue.position = position;
  }
  function skipWhitespace() {
    input = input.replace(/^\s+/, '');
  }

  // 4.1 WebVTT cue timings.
  skipWhitespace();
  cue.startTime = consumeTimeStamp(); // (1) collect cue start time
  skipWhitespace();
  if (input.slice(0, 3) !== '-->') {
    // (3) next characters must match '-->'
    throw new Error("Malformed time stamp (time stamps must be separated by '-->'): " + oInput);
  }
  input = input.slice(3);
  skipWhitespace();
  cue.endTime = consumeTimeStamp(); // (5) collect cue end time

  // 4.1 WebVTT cue settings list.
  skipWhitespace();
  consumeCueSettings(input, cue);
}
function fixLineBreaks(input) {
  return input.replace(/<br(?: \/)?>/gi, '\n');
}
class VTTParser {
  constructor() {
    this.state = 'INITIAL';
    this.buffer = '';
    this.decoder = new StringDecoder();
    this.regionList = [];
    this.cue = null;
    this.oncue = void 0;
    this.onparsingerror = void 0;
    this.onflush = void 0;
  }
  parse(data) {
    const _this = this;

    // If there is no data then we won't decode it, but will just try to parse
    // whatever is in buffer already. This may occur in circumstances, for
    // example when flush() is called.
    if (data) {
      // Try to decode the data that we received.
      _this.buffer += _this.decoder.decode(data, {
        stream: true
      });
    }
    function collectNextLine() {
      let buffer = _this.buffer;
      let pos = 0;
      buffer = fixLineBreaks(buffer);
      while (pos < buffer.length && buffer[pos] !== '\r' && buffer[pos] !== '\n') {
        ++pos;
      }
      const line = buffer.slice(0, pos);
      // Advance the buffer early in case we fail below.
      if (buffer[pos] === '\r') {
        ++pos;
      }
      if (buffer[pos] === '\n') {
        ++pos;
      }
      _this.buffer = buffer.slice(pos);
      return line;
    }

    // 3.2 WebVTT metadata header syntax
    function parseHeader(input) {
      parseOptions(input, function (k, v) {
        // switch (k) {
        // case 'region':
        // 3.3 WebVTT region metadata header syntax
        // console.log('parse region', v);
        // parseRegion(v);
        // break;
        // }
      }, /:/);
    }

    // 5.1 WebVTT file parsing.
    try {
      let line = '';
      if (_this.state === 'INITIAL') {
        // We can't start parsing until we have the first line.
        if (!/\r\n|\n/.test(_this.buffer)) {
          return this;
        }
        line = collectNextLine();
        // strip of UTF-8 BOM if any
        // https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8
        const m = line.match(/^(ï»¿)?WEBVTT([ \t].*)?$/);
        if (!(m != null && m[0])) {
          throw new Error('Malformed WebVTT signature.');
        }
        _this.state = 'HEADER';
      }
      let alreadyCollectedLine = false;
      while (_this.buffer) {
        // We can't parse a line until we have the full line.
        if (!/\r\n|\n/.test(_this.buffer)) {
          return this;
        }
        if (!alreadyCollectedLine) {
          line = collectNextLine();
        } else {
          alreadyCollectedLine = false;
        }
        switch (_this.state) {
          case 'HEADER':
            // 13-18 - Allow a header (metadata) under the WEBVTT line.
            if (/:/.test(line)) {
              parseHeader(line);
            } else if (!line) {
              // An empty line terminates the header and starts the body (cues).
              _this.state = 'ID';
            }
            continue;
          case 'NOTE':
            // Ignore NOTE blocks.
            if (!line) {
              _this.state = 'ID';
            }
            continue;
          case 'ID':
            // Check for the start of NOTE blocks.
            if (/^NOTE($|[ \t])/.test(line)) {
              _this.state = 'NOTE';
              break;
            }
            // 19-29 - Allow any number of line terminators, then initialize new cue values.
            if (!line) {
              continue;
            }
            _this.cue = new VTTCue(0, 0, '');
            _this.state = 'CUE';
            // 30-39 - Check if self line contains an optional identifier or timing data.
            if (line.indexOf('-->') === -1) {
              _this.cue.id = line;
              continue;
            }
          // Process line as start of a cue.
          /* falls through */
          case 'CUE':
            // 40 - Collect cue timings and settings.
            if (!_this.cue) {
              _this.state = 'BADCUE';
              continue;
            }
            try {
              parseCue(line, _this.cue, _this.regionList);
            } catch (e) {
              // In case of an error ignore rest of the cue.
              _this.cue = null;
              _this.state = 'BADCUE';
              continue;
            }
            _this.state = 'CUETEXT';
            continue;
          case 'CUETEXT':
            {
              const hasSubstring = line.indexOf('-->') !== -1;
              // 34 - If we have an empty line then report the cue.
              // 35 - If we have the special substring '-->' then report the cue,
              // but do not collect the line as we need to process the current
              // one as a new cue.
              if (!line || hasSubstring && (alreadyCollectedLine = true)) {
                // We are done parsing self cue.
                if (_this.oncue && _this.cue) {
                  _this.oncue(_this.cue);
                }
                _this.cue = null;
                _this.state = 'ID';
                continue;
              }
              if (_this.cue === null) {
                continue;
              }
              if (_this.cue.text) {
                _this.cue.text += '\n';
              }
              _this.cue.text += line;
            }
            continue;
          case 'BADCUE':
            // 54-62 - Collect and discard the remaining cue.
            if (!line) {
              _this.state = 'ID';
            }
        }
      }
    } catch (e) {
      // If we are currently parsing a cue, report what we have.
      if (_this.state === 'CUETEXT' && _this.cue && _this.oncue) {
        _this.oncue(_this.cue);
      }
      _this.cue = null;
      // Enter BADWEBVTT state if header was not parsed correctly otherwise
      // another exception occurred so enter BADCUE state.
      _this.state = _this.state === 'INITIAL' ? 'BADWEBVTT' : 'BADCUE';
    }
    return this;
  }
  flush() {
    const _this = this;
    try {
      // Finish decoding the stream.
      // _this.buffer += _this.decoder.decode();
      // Synthesize the end of the current cue or region.
      if (_this.cue || _this.state === 'HEADER') {
        _this.buffer += '\n\n';
        _this.parse();
      }
      // If we've flushed, parsed, and we're still on the INITIAL state then
      // that means we don't have enough of the stream to parse the first
      // line.
      if (_this.state === 'INITIAL' || _this.state === 'BADWEBVTT') {
        throw new Error('Malformed WebVTT signature.');
      }
    } catch (e) {
      if (_this.onparsingerror) {
        _this.onparsingerror(e);
      }
    }
    if (_this.onflush) {
      _this.onflush();
    }
    return this;
  }
}

const LINEBREAKS = /\r\n|\n\r|\n|\r/g;

// String.prototype.startsWith is not supported in IE11
const startsWith = function startsWith(inputString, searchString, position = 0) {
  return inputString.slice(position, position + searchString.length) === searchString;
};
const cueString2millis = function cueString2millis(timeString) {
  let ts = parseInt(timeString.slice(-3));
  const secs = parseInt(timeString.slice(-6, -4));
  const mins = parseInt(timeString.slice(-9, -7));
  const hours = timeString.length > 9 ? parseInt(timeString.substring(0, timeString.indexOf(':'))) : 0;
  if (!isFiniteNumber(ts) || !isFiniteNumber(secs) || !isFiniteNumber(mins) || !isFiniteNumber(hours)) {
    throw Error(`Malformed X-TIMESTAMP-MAP: Local:${timeString}`);
  }
  ts += 1000 * secs;
  ts += 60 * 1000 * mins;
  ts += 60 * 60 * 1000 * hours;
  return ts;
};

// From https://github.com/darkskyapp/string-hash
const hash = function hash(text) {
  let _hash = 5381;
  let i = text.length;
  while (i) {
    _hash = _hash * 33 ^ text.charCodeAt(--i);
  }
  return (_hash >>> 0).toString();
};

// Create a unique hash id for a cue based on start/end times and text.
// This helps timeline-controller to avoid showing repeated captions.
function generateCueId(startTime, endTime, text) {
  return hash(startTime.toString()) + hash(endTime.toString()) + hash(text);
}
const calculateOffset = function calculateOffset(vttCCs, cc, presentationTime) {
  let currCC = vttCCs[cc];
  let prevCC = vttCCs[currCC.prevCC];

  // This is the first discontinuity or cues have been processed since the last discontinuity
  // Offset = current discontinuity time
  if (!prevCC || !prevCC.new && currCC.new) {
    vttCCs.ccOffset = vttCCs.presentationOffset = currCC.start;
    currCC.new = false;
    return;
  }

  // There have been discontinuities since cues were last parsed.
  // Offset = time elapsed
  while ((_prevCC = prevCC) != null && _prevCC.new) {
    var _prevCC;
    vttCCs.ccOffset += currCC.start - prevCC.start;
    currCC.new = false;
    currCC = prevCC;
    prevCC = vttCCs[currCC.prevCC];
  }
  vttCCs.presentationOffset = presentationTime;
};
function parseWebVTT(vttByteArray, initPTS, vttCCs, cc, timeOffset, callBack, errorCallBack) {
  const parser = new VTTParser();
  // Convert byteArray into string, replacing any somewhat exotic linefeeds with "\n", then split on that character.
  // Uint8Array.prototype.reduce is not implemented in IE11
  const vttLines = utf8ArrayToStr(new Uint8Array(vttByteArray)).trim().replace(LINEBREAKS, '\n').split('\n');
  const cues = [];
  const init90kHz = initPTS ? toMpegTsClockFromTimescale(initPTS.baseTime, initPTS.timescale) : 0;
  let cueTime = '00:00.000';
  let timestampMapMPEGTS = 0;
  let timestampMapLOCAL = 0;
  let parsingError;
  let inHeader = true;
  parser.oncue = function (cue) {
    // Adjust cue timing; clamp cues to start no earlier than - and drop cues that don't end after - 0 on timeline.
    const currCC = vttCCs[cc];
    let cueOffset = vttCCs.ccOffset;

    // Calculate subtitle PTS offset
    const webVttMpegTsMapOffset = (timestampMapMPEGTS - init90kHz) / 90000;

    // Update offsets for new discontinuities
    if (currCC != null && currCC.new) {
      if (timestampMapLOCAL !== undefined) {
        // When local time is provided, offset = discontinuity start time - local time
        cueOffset = vttCCs.ccOffset = currCC.start;
      } else {
        calculateOffset(vttCCs, cc, webVttMpegTsMapOffset);
      }
    }
    if (webVttMpegTsMapOffset) {
      if (!initPTS) {
        parsingError = new Error('Missing initPTS for VTT MPEGTS');
        return;
      }
      // If we have MPEGTS, offset = presentation time + discontinuity offset
      cueOffset = webVttMpegTsMapOffset - vttCCs.presentationOffset;
    }
    const duration = cue.endTime - cue.startTime;
    const startTime = normalizePts((cue.startTime + cueOffset - timestampMapLOCAL) * 90000, timeOffset * 90000) / 90000;
    cue.startTime = Math.max(startTime, 0);
    cue.endTime = Math.max(startTime + duration, 0);

    //trim trailing webvtt block whitespaces
    const text = cue.text.trim();

    // Fix encoding of special characters
    cue.text = decodeURIComponent(encodeURIComponent(text));

    // If the cue was not assigned an id from the VTT file (line above the content), create one.
    if (!cue.id) {
      cue.id = generateCueId(cue.startTime, cue.endTime, text);
    }
    if (cue.endTime > 0) {
      cues.push(cue);
    }
  };
  parser.onparsingerror = function (error) {
    parsingError = error;
  };
  parser.onflush = function () {
    if (parsingError) {
      errorCallBack(parsingError);
      return;
    }
    callBack(cues);
  };

  // Go through contents line by line.
  vttLines.forEach(line => {
    if (inHeader) {
      // Look for X-TIMESTAMP-MAP in header.
      if (startsWith(line, 'X-TIMESTAMP-MAP=')) {
        // Once found, no more are allowed anyway, so stop searching.
        inHeader = false;
        // Extract LOCAL and MPEGTS.
        line.slice(16).split(',').forEach(timestamp => {
          if (startsWith(timestamp, 'LOCAL:')) {
            cueTime = timestamp.slice(6);
          } else if (startsWith(timestamp, 'MPEGTS:')) {
            timestampMapMPEGTS = parseInt(timestamp.slice(7));
          }
        });
        try {
          // Convert cue time to seconds
          timestampMapLOCAL = cueString2millis(cueTime) / 1000;
        } catch (error) {
          parsingError = error;
        }
        // Return without parsing X-TIMESTAMP-MAP line.
        return;
      } else if (line === '') {
        inHeader = false;
      }
    }
    // Parse line by default.
    parser.parse(line + '\n');
  });
  parser.flush();
}

const IMSC1_CODEC = 'stpp.ttml.im1t';

// Time format: h:m:s:frames(.subframes)
const HMSF_REGEX = /^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/;

// Time format: hours, minutes, seconds, milliseconds, frames, ticks
const TIME_UNIT_REGEX = /^(\d*(?:\.\d*)?)(h|m|s|ms|f|t)$/;
const textAlignToLineAlign = {
  left: 'start',
  center: 'center',
  right: 'end',
  start: 'start',
  end: 'end'
};
function parseIMSC1(payload, initPTS, callBack, errorCallBack) {
  const results = findBox(new Uint8Array(payload), ['mdat']);
  if (results.length === 0) {
    errorCallBack(new Error('Could not parse IMSC1 mdat'));
    return;
  }
  const ttmlList = results.map(mdat => utf8ArrayToStr(mdat));
  const syncTime = toTimescaleFromScale(initPTS.baseTime, 1, initPTS.timescale);
  try {
    ttmlList.forEach(ttml => callBack(parseTTML(ttml, syncTime)));
  } catch (error) {
    errorCallBack(error);
  }
}
function parseTTML(ttml, syncTime) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(ttml, 'text/xml');
  const tt = xmlDoc.getElementsByTagName('tt')[0];
  if (!tt) {
    throw new Error('Invalid ttml');
  }
  const defaultRateInfo = {
    frameRate: 30,
    subFrameRate: 1,
    frameRateMultiplier: 0,
    tickRate: 0
  };
  const rateInfo = Object.keys(defaultRateInfo).reduce((result, key) => {
    result[key] = tt.getAttribute(`ttp:${key}`) || defaultRateInfo[key];
    return result;
  }, {});
  const trim = tt.getAttribute('xml:space') !== 'preserve';
  const styleElements = collectionToDictionary(getElementCollection(tt, 'styling', 'style'));
  const regionElements = collectionToDictionary(getElementCollection(tt, 'layout', 'region'));
  const cueElements = getElementCollection(tt, 'body', '[begin]');
  return [].map.call(cueElements, cueElement => {
    const cueText = getTextContent(cueElement, trim);
    if (!cueText || !cueElement.hasAttribute('begin')) {
      return null;
    }
    const startTime = parseTtmlTime(cueElement.getAttribute('begin'), rateInfo);
    const duration = parseTtmlTime(cueElement.getAttribute('dur'), rateInfo);
    let endTime = parseTtmlTime(cueElement.getAttribute('end'), rateInfo);
    if (startTime === null) {
      throw timestampParsingError(cueElement);
    }
    if (endTime === null) {
      if (duration === null) {
        throw timestampParsingError(cueElement);
      }
      endTime = startTime + duration;
    }
    const cue = new VTTCue(startTime - syncTime, endTime - syncTime, cueText);
    cue.id = generateCueId(cue.startTime, cue.endTime, cue.text);
    const region = regionElements[cueElement.getAttribute('region')];
    const style = styleElements[cueElement.getAttribute('style')];

    // Apply styles to cue
    const styles = getTtmlStyles(region, style, styleElements);
    const {
      textAlign
    } = styles;
    if (textAlign) {
      // cue.positionAlign not settable in FF~2016
      const lineAlign = textAlignToLineAlign[textAlign];
      if (lineAlign) {
        cue.lineAlign = lineAlign;
      }
      cue.align = textAlign;
    }
    _extends(cue, styles);
    return cue;
  }).filter(cue => cue !== null);
}
function getElementCollection(fromElement, parentName, childName) {
  const parent = fromElement.getElementsByTagName(parentName)[0];
  if (parent) {
    return [].slice.call(parent.querySelectorAll(childName));
  }
  return [];
}
function collectionToDictionary(elementsWithId) {
  return elementsWithId.reduce((dict, element) => {
    const id = element.getAttribute('xml:id');
    if (id) {
      dict[id] = element;
    }
    return dict;
  }, {});
}
function getTextContent(element, trim) {
  return [].slice.call(element.childNodes).reduce((str, node, i) => {
    var _node$childNodes;
    if (node.nodeName === 'br' && i) {
      return str + '\n';
    }
    if ((_node$childNodes = node.childNodes) != null && _node$childNodes.length) {
      return getTextContent(node, trim);
    } else if (trim) {
      return str + node.textContent.trim().replace(/\s+/g, ' ');
    }
    return str + node.textContent;
  }, '');
}
function getTtmlStyles(region, style, styleElements) {
  const ttsNs = 'http://www.w3.org/ns/ttml#styling';
  let regionStyle = null;
  const styleAttributes = ['displayAlign', 'textAlign', 'color', 'backgroundColor', 'fontSize', 'fontFamily'
  // 'fontWeight',
  // 'lineHeight',
  // 'wrapOption',
  // 'fontStyle',
  // 'direction',
  // 'writingMode'
  ];

  const regionStyleName = region != null && region.hasAttribute('style') ? region.getAttribute('style') : null;
  if (regionStyleName && styleElements.hasOwnProperty(regionStyleName)) {
    regionStyle = styleElements[regionStyleName];
  }
  return styleAttributes.reduce((styles, name) => {
    const value = getAttributeNS(style, ttsNs, name) || getAttributeNS(region, ttsNs, name) || getAttributeNS(regionStyle, ttsNs, name);
    if (value) {
      styles[name] = value;
    }
    return styles;
  }, {});
}
function getAttributeNS(element, ns, name) {
  if (!element) {
    return null;
  }
  return element.hasAttributeNS(ns, name) ? element.getAttributeNS(ns, name) : null;
}
function timestampParsingError(node) {
  return new Error(`Could not parse ttml timestamp ${node}`);
}
function parseTtmlTime(timeAttributeValue, rateInfo) {
  if (!timeAttributeValue) {
    return null;
  }
  let seconds = parseTimeStamp(timeAttributeValue);
  if (seconds === null) {
    if (HMSF_REGEX.test(timeAttributeValue)) {
      seconds = parseHoursMinutesSecondsFrames(timeAttributeValue, rateInfo);
    } else if (TIME_UNIT_REGEX.test(timeAttributeValue)) {
      seconds = parseTimeUnits(timeAttributeValue, rateInfo);
    }
  }
  return seconds;
}
function parseHoursMinutesSecondsFrames(timeAttributeValue, rateInfo) {
  const m = HMSF_REGEX.exec(timeAttributeValue);
  const frames = (m[4] | 0) + (m[5] | 0) / rateInfo.subFrameRate;
  return (m[1] | 0) * 3600 + (m[2] | 0) * 60 + (m[3] | 0) + frames / rateInfo.frameRate;
}
function parseTimeUnits(timeAttributeValue, rateInfo) {
  const m = TIME_UNIT_REGEX.exec(timeAttributeValue);
  const value = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 'h':
      return value * 3600;
    case 'm':
      return value * 60;
    case 'ms':
      return value * 1000;
    case 'f':
      return value / rateInfo.frameRate;
    case 't':
      return value / rateInfo.tickRate;
  }
  return value;
}

class TimelineController {
  constructor(hls) {
    this.hls = void 0;
    this.media = null;
    this.config = void 0;
    this.enabled = true;
    this.Cues = void 0;
    this.textTracks = [];
    this.tracks = [];
    this.initPTS = [];
    this.unparsedVttFrags = [];
    this.captionsTracks = {};
    this.nonNativeCaptionsTracks = {};
    this.cea608Parser1 = void 0;
    this.cea608Parser2 = void 0;
    this.lastSn = -1;
    this.lastPartIndex = -1;
    this.prevCC = -1;
    this.vttCCs = newVTTCCs();
    this.captionsProperties = void 0;
    this.hls = hls;
    this.config = hls.config;
    this.Cues = hls.config.cueHandler;
    this.captionsProperties = {
      textTrack1: {
        label: this.config.captionsTextTrack1Label,
        languageCode: this.config.captionsTextTrack1LanguageCode
      },
      textTrack2: {
        label: this.config.captionsTextTrack2Label,
        languageCode: this.config.captionsTextTrack2LanguageCode
      },
      textTrack3: {
        label: this.config.captionsTextTrack3Label,
        languageCode: this.config.captionsTextTrack3LanguageCode
      },
      textTrack4: {
        label: this.config.captionsTextTrack4Label,
        languageCode: this.config.captionsTextTrack4LanguageCode
      }
    };
    if (this.config.enableCEA708Captions) {
      const channel1 = new OutputFilter(this, 'textTrack1');
      const channel2 = new OutputFilter(this, 'textTrack2');
      const channel3 = new OutputFilter(this, 'textTrack3');
      const channel4 = new OutputFilter(this, 'textTrack4');
      this.cea608Parser1 = new Cea608Parser(1, channel1, channel2);
      this.cea608Parser2 = new Cea608Parser(3, channel3, channel4);
    }
    hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.on(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.on(Events.FRAG_PARSING_USERDATA, this.onFragParsingUserdata, this);
    hls.on(Events.FRAG_DECRYPTED, this.onFragDecrypted, this);
    hls.on(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.on(Events.SUBTITLE_TRACKS_CLEARED, this.onSubtitleTracksCleared, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
  }
  destroy() {
    const {
      hls
    } = this;
    hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.off(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
    hls.off(Events.FRAG_PARSING_USERDATA, this.onFragParsingUserdata, this);
    hls.off(Events.FRAG_DECRYPTED, this.onFragDecrypted, this);
    hls.off(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.off(Events.SUBTITLE_TRACKS_CLEARED, this.onSubtitleTracksCleared, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    // @ts-ignore
    this.hls = this.config = this.cea608Parser1 = this.cea608Parser2 = null;
  }
  addCues(trackName, startTime, endTime, screen, cueRanges) {
    // skip cues which overlap more than 50% with previously parsed time ranges
    let merged = false;
    for (let i = cueRanges.length; i--;) {
      const cueRange = cueRanges[i];
      const overlap = intersection(cueRange[0], cueRange[1], startTime, endTime);
      if (overlap >= 0) {
        cueRange[0] = Math.min(cueRange[0], startTime);
        cueRange[1] = Math.max(cueRange[1], endTime);
        merged = true;
        if (overlap / (endTime - startTime) > 0.5) {
          return;
        }
      }
    }
    if (!merged) {
      cueRanges.push([startTime, endTime]);
    }
    if (this.config.renderTextTracksNatively) {
      const track = this.captionsTracks[trackName];
      this.Cues.newCue(track, startTime, endTime, screen);
    } else {
      const cues = this.Cues.newCue(null, startTime, endTime, screen);
      this.hls.trigger(Events.CUES_PARSED, {
        type: 'captions',
        cues,
        track: trackName
      });
    }
  }

  // Triggered when an initial PTS is found; used for synchronisation of WebVTT.
  onInitPtsFound(event, {
    frag,
    id,
    initPTS,
    timescale
  }) {
    const {
      unparsedVttFrags
    } = this;
    if (id === 'main') {
      this.initPTS[frag.cc] = {
        baseTime: initPTS,
        timescale
      };
    }

    // Due to asynchronous processing, initial PTS may arrive later than the first VTT fragments are loaded.
    // Parse any unparsed fragments upon receiving the initial PTS.
    if (unparsedVttFrags.length) {
      this.unparsedVttFrags = [];
      unparsedVttFrags.forEach(frag => {
        this.onFragLoaded(Events.FRAG_LOADED, frag);
      });
    }
  }
  getExistingTrack(trackName) {
    const {
      media
    } = this;
    if (media) {
      for (let i = 0; i < media.textTracks.length; i++) {
        const textTrack = media.textTracks[i];
        if (textTrack[trackName]) {
          return textTrack;
        }
      }
    }
    return null;
  }
  createCaptionsTrack(trackName) {
    if (this.config.renderTextTracksNatively) {
      this.createNativeTrack(trackName);
    } else {
      this.createNonNativeTrack(trackName);
    }
  }
  createNativeTrack(trackName) {
    if (this.captionsTracks[trackName]) {
      return;
    }
    const {
      captionsProperties,
      captionsTracks,
      media
    } = this;
    const {
      label,
      languageCode
    } = captionsProperties[trackName];
    // Enable reuse of existing text track.
    const existingTrack = this.getExistingTrack(trackName);
    if (!existingTrack) {
      const textTrack = this.createTextTrack('captions', label, languageCode);
      if (textTrack) {
        // Set a special property on the track so we know it's managed by Hls.js
        textTrack[trackName] = true;
        captionsTracks[trackName] = textTrack;
      }
    } else {
      captionsTracks[trackName] = existingTrack;
      clearCurrentCues(captionsTracks[trackName]);
      sendAddTrackEvent(captionsTracks[trackName], media);
    }
  }
  createNonNativeTrack(trackName) {
    if (this.nonNativeCaptionsTracks[trackName]) {
      return;
    }
    // Create a list of a single track for the provider to consume
    const trackProperties = this.captionsProperties[trackName];
    if (!trackProperties) {
      return;
    }
    const label = trackProperties.label;
    const track = {
      _id: trackName,
      label,
      kind: 'captions',
      default: trackProperties.media ? !!trackProperties.media.default : false,
      closedCaptions: trackProperties.media
    };
    this.nonNativeCaptionsTracks[trackName] = track;
    this.hls.trigger(Events.NON_NATIVE_TEXT_TRACKS_FOUND, {
      tracks: [track]
    });
  }
  createTextTrack(kind, label, lang) {
    const media = this.media;
    if (!media) {
      return;
    }
    return media.addTextTrack(kind, label, lang);
  }
  onMediaAttaching(event, data) {
    this.media = data.media;
    this._cleanTracks();
  }
  onMediaDetaching() {
    const {
      captionsTracks
    } = this;
    Object.keys(captionsTracks).forEach(trackName => {
      clearCurrentCues(captionsTracks[trackName]);
      delete captionsTracks[trackName];
    });
    this.nonNativeCaptionsTracks = {};
  }
  onManifestLoading() {
    this.lastSn = -1; // Detect discontinuity in fragment parsing
    this.lastPartIndex = -1;
    this.prevCC = -1;
    this.vttCCs = newVTTCCs(); // Detect discontinuity in subtitle manifests
    this._cleanTracks();
    this.tracks = [];
    this.captionsTracks = {};
    this.nonNativeCaptionsTracks = {};
    this.textTracks = [];
    this.unparsedVttFrags = [];
    this.initPTS = [];
    if (this.cea608Parser1 && this.cea608Parser2) {
      this.cea608Parser1.reset();
      this.cea608Parser2.reset();
    }
  }
  _cleanTracks() {
    // clear outdated subtitles
    const {
      media
    } = this;
    if (!media) {
      return;
    }
    const textTracks = media.textTracks;
    if (textTracks) {
      for (let i = 0; i < textTracks.length; i++) {
        clearCurrentCues(textTracks[i]);
      }
    }
  }
  onSubtitleTracksUpdated(event, data) {
    const tracks = data.subtitleTracks || [];
    const hasIMSC1 = tracks.some(track => track.textCodec === IMSC1_CODEC);
    if (this.config.enableWebVTT || hasIMSC1 && this.config.enableIMSC1) {
      const listIsIdentical = subtitleOptionsIdentical(this.tracks, tracks);
      if (listIsIdentical) {
        this.tracks = tracks;
        return;
      }
      this.textTracks = [];
      this.tracks = tracks;
      if (this.config.renderTextTracksNatively) {
        const inUseTracks = this.media ? this.media.textTracks : null;
        this.tracks.forEach((track, index) => {
          let textTrack;
          if (inUseTracks && index < inUseTracks.length) {
            let inUseTrack = null;
            for (let i = 0; i < inUseTracks.length; i++) {
              if (canReuseVttTextTrack(inUseTracks[i], track)) {
                inUseTrack = inUseTracks[i];
                break;
              }
            }

            // Reuse tracks with the same label, but do not reuse 608/708 tracks
            if (inUseTrack) {
              textTrack = inUseTrack;
            }
          }
          if (textTrack) {
            clearCurrentCues(textTrack);
          } else {
            const textTrackKind = this._captionsOrSubtitlesFromCharacteristics(track);
            textTrack = this.createTextTrack(textTrackKind, track.name, track.lang);
            if (textTrack) {
              textTrack.mode = 'disabled';
            }
          }
          if (textTrack) {
            textTrack.groupId = track.groupId;
            this.textTracks.push(textTrack);
          }
        });
      } else if (this.tracks.length) {
        // Create a list of tracks for the provider to consume
        const tracksList = this.tracks.map(track => {
          return {
            label: track.name,
            kind: track.type.toLowerCase(),
            default: track.default,
            subtitleTrack: track
          };
        });
        this.hls.trigger(Events.NON_NATIVE_TEXT_TRACKS_FOUND, {
          tracks: tracksList
        });
      }
    }
  }
  _captionsOrSubtitlesFromCharacteristics(track) {
    if (track.attrs.CHARACTERISTICS) {
      const transcribesSpokenDialog = /transcribes-spoken-dialog/gi.test(track.attrs.CHARACTERISTICS);
      const describesMusicAndSound = /describes-music-and-sound/gi.test(track.attrs.CHARACTERISTICS);
      if (transcribesSpokenDialog && describesMusicAndSound) {
        return 'captions';
      }
    }
    return 'subtitles';
  }
  onManifestLoaded(event, data) {
    if (this.config.enableCEA708Captions && data.captions) {
      data.captions.forEach(captionsTrack => {
        const instreamIdMatch = /(?:CC|SERVICE)([1-4])/.exec(captionsTrack.instreamId);
        if (!instreamIdMatch) {
          return;
        }
        const trackName = `textTrack${instreamIdMatch[1]}`;
        const trackProperties = this.captionsProperties[trackName];
        if (!trackProperties) {
          return;
        }
        trackProperties.label = captionsTrack.name;
        if (captionsTrack.lang) {
          // optional attribute
          trackProperties.languageCode = captionsTrack.lang;
        }
        trackProperties.media = captionsTrack;
      });
    }
  }
  closedCaptionsForLevel(frag) {
    const level = this.hls.levels[frag.level];
    return level == null ? void 0 : level.attrs['CLOSED-CAPTIONS'];
  }
  onFragLoading(event, data) {
    const {
      cea608Parser1,
      cea608Parser2,
      lastSn,
      lastPartIndex
    } = this;
    if (!this.enabled || !(cea608Parser1 && cea608Parser2)) {
      return;
    }
    // if this frag isn't contiguous, clear the parser so cues with bad start/end times aren't added to the textTrack
    if (data.frag.type === PlaylistLevelType.MAIN) {
      var _data$part$index, _data$part;
      const sn = data.frag.sn;
      const partIndex = (_data$part$index = data == null ? void 0 : (_data$part = data.part) == null ? void 0 : _data$part.index) != null ? _data$part$index : -1;
      if (!(sn === lastSn + 1 || sn === lastSn && partIndex === lastPartIndex + 1)) {
        cea608Parser1.reset();
        cea608Parser2.reset();
      }
      this.lastSn = sn;
      this.lastPartIndex = partIndex;
    }
  }
  onFragLoaded(event, data) {
    const {
      frag,
      payload
    } = data;
    if (frag.type === PlaylistLevelType.SUBTITLE) {
      // If fragment is subtitle type, parse as WebVTT.
      if (payload.byteLength) {
        const decryptData = frag.decryptdata;
        // fragment after decryption has a stats object
        const decrypted = ('stats' in data);
        // If the subtitles are not encrypted, parse VTTs now. Otherwise, we need to wait.
        if (decryptData == null || !decryptData.encrypted || decrypted) {
          const trackPlaylistMedia = this.tracks[frag.level];
          const vttCCs = this.vttCCs;
          if (!vttCCs[frag.cc]) {
            vttCCs[frag.cc] = {
              start: frag.start,
              prevCC: this.prevCC,
              new: true
            };
            this.prevCC = frag.cc;
          }
          if (trackPlaylistMedia && trackPlaylistMedia.textCodec === IMSC1_CODEC) {
            this._parseIMSC1(frag, payload);
          } else {
            this._parseVTTs(data);
          }
        }
      } else {
        // In case there is no payload, finish unsuccessfully.
        this.hls.trigger(Events.SUBTITLE_FRAG_PROCESSED, {
          success: false,
          frag,
          error: new Error('Empty subtitle payload')
        });
      }
    }
  }
  _parseIMSC1(frag, payload) {
    const hls = this.hls;
    parseIMSC1(payload, this.initPTS[frag.cc], cues => {
      this._appendCues(cues, frag.level);
      hls.trigger(Events.SUBTITLE_FRAG_PROCESSED, {
        success: true,
        frag: frag
      });
    }, error => {
      logger.log(`Failed to parse IMSC1: ${error}`);
      hls.trigger(Events.SUBTITLE_FRAG_PROCESSED, {
        success: false,
        frag: frag,
        error
      });
    });
  }
  _parseVTTs(data) {
    var _frag$initSegment;
    const {
      frag,
      payload
    } = data;
    // We need an initial synchronisation PTS. Store fragments as long as none has arrived
    const {
      initPTS,
      unparsedVttFrags
    } = this;
    const maxAvCC = initPTS.length - 1;
    if (!initPTS[frag.cc] && maxAvCC === -1) {
      unparsedVttFrags.push(data);
      return;
    }
    const hls = this.hls;
    // Parse the WebVTT file contents.
    const payloadWebVTT = (_frag$initSegment = frag.initSegment) != null && _frag$initSegment.data ? appendUint8Array(frag.initSegment.data, new Uint8Array(payload)) : payload;
    parseWebVTT(payloadWebVTT, this.initPTS[frag.cc], this.vttCCs, frag.cc, frag.start, cues => {
      this._appendCues(cues, frag.level);
      hls.trigger(Events.SUBTITLE_FRAG_PROCESSED, {
        success: true,
        frag: frag
      });
    }, error => {
      const missingInitPTS = error.message === 'Missing initPTS for VTT MPEGTS';
      if (missingInitPTS) {
        unparsedVttFrags.push(data);
      } else {
        this._fallbackToIMSC1(frag, payload);
      }
      // Something went wrong while parsing. Trigger event with success false.
      logger.log(`Failed to parse VTT cue: ${error}`);
      if (missingInitPTS && maxAvCC > frag.cc) {
        return;
      }
      hls.trigger(Events.SUBTITLE_FRAG_PROCESSED, {
        success: false,
        frag: frag,
        error
      });
    });
  }
  _fallbackToIMSC1(frag, payload) {
    // If textCodec is unknown, try parsing as IMSC1. Set textCodec based on the result
    const trackPlaylistMedia = this.tracks[frag.level];
    if (!trackPlaylistMedia.textCodec) {
      parseIMSC1(payload, this.initPTS[frag.cc], () => {
        trackPlaylistMedia.textCodec = IMSC1_CODEC;
        this._parseIMSC1(frag, payload);
      }, () => {
        trackPlaylistMedia.textCodec = 'wvtt';
      });
    }
  }
  _appendCues(cues, fragLevel) {
    const hls = this.hls;
    if (this.config.renderTextTracksNatively) {
      const textTrack = this.textTracks[fragLevel];
      // WebVTTParser.parse is an async method and if the currently selected text track mode is set to "disabled"
      // before parsing is done then don't try to access currentTrack.cues.getCueById as cues will be null
      // and trying to access getCueById method of cues will throw an exception
      // Because we check if the mode is disabled, we can force check `cues` below. They can't be null.
      if (!textTrack || textTrack.mode === 'disabled') {
        return;
      }
      cues.forEach(cue => addCueToTrack(textTrack, cue));
    } else {
      const currentTrack = this.tracks[fragLevel];
      if (!currentTrack) {
        return;
      }
      const track = currentTrack.default ? 'default' : 'subtitles' + fragLevel;
      hls.trigger(Events.CUES_PARSED, {
        type: 'subtitles',
        cues,
        track
      });
    }
  }
  onFragDecrypted(event, data) {
    const {
      frag
    } = data;
    if (frag.type === PlaylistLevelType.SUBTITLE) {
      this.onFragLoaded(Events.FRAG_LOADED, data);
    }
  }
  onSubtitleTracksCleared() {
    this.tracks = [];
    this.captionsTracks = {};
  }
  onFragParsingUserdata(event, data) {
    const {
      cea608Parser1,
      cea608Parser2
    } = this;
    if (!this.enabled || !(cea608Parser1 && cea608Parser2)) {
      return;
    }
    const {
      frag,
      samples
    } = data;
    if (frag.type === PlaylistLevelType.MAIN && this.closedCaptionsForLevel(frag) === 'NONE') {
      return;
    }
    // If the event contains captions (found in the bytes property), push all bytes into the parser immediately
    // It will create the proper timestamps based on the PTS value
    for (let i = 0; i < samples.length; i++) {
      const ccBytes = samples[i].bytes;
      if (ccBytes) {
        const ccdatas = this.extractCea608Data(ccBytes);
        cea608Parser1.addData(samples[i].pts, ccdatas[0]);
        cea608Parser2.addData(samples[i].pts, ccdatas[1]);
      }
    }
  }
  onBufferFlushing(event, {
    startOffset,
    endOffset,
    endOffsetSubtitles,
    type
  }) {
    const {
      media
    } = this;
    if (!media || media.currentTime < endOffset) {
      return;
    }
    // Clear 608 caption cues from the captions TextTracks when the video back buffer is flushed
    // Forward cues are never removed because we can loose streamed 608 content from recent fragments
    if (!type || type === 'video') {
      const {
        captionsTracks
      } = this;
      Object.keys(captionsTracks).forEach(trackName => removeCuesInRange(captionsTracks[trackName], startOffset, endOffset));
    }
    if (this.config.renderTextTracksNatively) {
      // Clear VTT/IMSC1 subtitle cues from the subtitle TextTracks when the back buffer is flushed
      if (startOffset === 0 && endOffsetSubtitles !== undefined) {
        const {
          textTracks
        } = this;
        Object.keys(textTracks).forEach(trackName => removeCuesInRange(textTracks[trackName], startOffset, endOffsetSubtitles));
      }
    }
  }
  extractCea608Data(byteArray) {
    const actualCCBytes = [[], []];
    const count = byteArray[0] & 0x1f;
    let position = 2;
    for (let j = 0; j < count; j++) {
      const tmpByte = byteArray[position++];
      const ccbyte1 = 0x7f & byteArray[position++];
      const ccbyte2 = 0x7f & byteArray[position++];
      if (ccbyte1 === 0 && ccbyte2 === 0) {
        continue;
      }
      const ccValid = (0x04 & tmpByte) !== 0; // Support all four channels
      if (ccValid) {
        const ccType = 0x03 & tmpByte;
        if (0x00 /* CEA608 field1*/ === ccType || 0x01 /* CEA608 field2*/ === ccType) {
          // Exclude CEA708 CC data.
          actualCCBytes[ccType].push(ccbyte1);
          actualCCBytes[ccType].push(ccbyte2);
        }
      }
    }
    return actualCCBytes;
  }
}
function canReuseVttTextTrack(inUseTrack, manifestTrack) {
  return !!inUseTrack && inUseTrack.label === manifestTrack.name && !(inUseTrack.textTrack1 || inUseTrack.textTrack2);
}
function intersection(x1, x2, y1, y2) {
  return Math.min(x2, y2) - Math.max(x1, y1);
}
function newVTTCCs() {
  return {
    ccOffset: 0,
    presentationOffset: 0,
    0: {
      start: 0,
      prevCC: -1,
      new: true
    }
  };
}

/*
 * cap stream level to media size dimension controller
 */

class CapLevelController {
  constructor(hls) {
    this.hls = void 0;
    this.autoLevelCapping = void 0;
    this.firstLevel = void 0;
    this.media = void 0;
    this.restrictedLevels = void 0;
    this.timer = void 0;
    this.clientRect = void 0;
    this.streamController = void 0;
    this.hls = hls;
    this.autoLevelCapping = Number.POSITIVE_INFINITY;
    this.firstLevel = -1;
    this.media = null;
    this.restrictedLevels = [];
    this.timer = undefined;
    this.clientRect = null;
    this.registerListeners();
  }
  setStreamController(streamController) {
    this.streamController = streamController;
  }
  destroy() {
    this.unregisterListener();
    if (this.hls.config.capLevelToPlayerSize) {
      this.stopCapping();
    }
    this.media = null;
    this.clientRect = null;
    // @ts-ignore
    this.hls = this.streamController = null;
  }
  registerListeners() {
    const {
      hls
    } = this;
    hls.on(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
    hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
  }
  unregisterListener() {
    const {
      hls
    } = this;
    hls.off(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
    hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
  }
  onFpsDropLevelCapping(event, data) {
    // Don't add a restricted level more than once
    const level = this.hls.levels[data.droppedLevel];
    if (this.isLevelAllowed(level)) {
      this.restrictedLevels.push({
        bitrate: level.bitrate,
        height: level.height,
        width: level.width
      });
    }
  }
  onMediaAttaching(event, data) {
    this.media = data.media instanceof HTMLVideoElement ? data.media : null;
    this.clientRect = null;
  }
  onManifestParsed(event, data) {
    const hls = this.hls;
    this.restrictedLevels = [];
    this.firstLevel = data.firstLevel;
    if (hls.config.capLevelToPlayerSize && data.video) {
      // Start capping immediately if the manifest has signaled video codecs
      this.startCapping();
    }
  }

  // Only activate capping when playing a video stream; otherwise, multi-bitrate audio-only streams will be restricted
  // to the first level
  onBufferCodecs(event, data) {
    const hls = this.hls;
    if (hls.config.capLevelToPlayerSize && data.video) {
      // If the manifest did not signal a video codec capping has been deferred until we're certain video is present
      this.startCapping();
    }
  }
  onMediaDetaching() {
    this.stopCapping();
  }
  detectPlayerSize() {
    if (this.media && this.mediaHeight > 0 && this.mediaWidth > 0) {
      const levels = this.hls.levels;
      if (levels.length) {
        const hls = this.hls;
        hls.autoLevelCapping = this.getMaxLevel(levels.length - 1);
        if (hls.autoLevelCapping > this.autoLevelCapping && this.streamController) {
          // if auto level capping has a higher value for the previous one, flush the buffer using nextLevelSwitch
          // usually happen when the user go to the fullscreen mode.
          this.streamController.nextLevelSwitch();
        }
        this.autoLevelCapping = hls.autoLevelCapping;
      }
    }
  }

  /*
   * returns level should be the one with the dimensions equal or greater than the media (player) dimensions (so the video will be downscaled)
   */
  getMaxLevel(capLevelIndex) {
    const levels = this.hls.levels;
    if (!levels.length) {
      return -1;
    }
    const validLevels = levels.filter((level, index) => this.isLevelAllowed(level) && index <= capLevelIndex);
    this.clientRect = null;
    return CapLevelController.getMaxLevelByMediaSize(validLevels, this.mediaWidth, this.mediaHeight);
  }
  startCapping() {
    if (this.timer) {
      // Don't reset capping if started twice; this can happen if the manifest signals a video codec
      return;
    }
    this.autoLevelCapping = Number.POSITIVE_INFINITY;
    this.hls.firstLevel = this.getMaxLevel(this.firstLevel);
    self.clearInterval(this.timer);
    this.timer = self.setInterval(this.detectPlayerSize.bind(this), 1000);
    this.detectPlayerSize();
  }
  stopCapping() {
    this.restrictedLevels = [];
    this.firstLevel = -1;
    this.autoLevelCapping = Number.POSITIVE_INFINITY;
    if (this.timer) {
      self.clearInterval(this.timer);
      this.timer = undefined;
    }
  }
  getDimensions() {
    if (this.clientRect) {
      return this.clientRect;
    }
    const media = this.media;
    const boundsRect = {
      width: 0,
      height: 0
    };
    if (media) {
      const clientRect = media.getBoundingClientRect();
      boundsRect.width = clientRect.width;
      boundsRect.height = clientRect.height;
      if (!boundsRect.width && !boundsRect.height) {
        // When the media element has no width or height (equivalent to not being in the DOM),
        // then use its width and height attributes (media.width, media.height)
        boundsRect.width = clientRect.right - clientRect.left || media.width || 0;
        boundsRect.height = clientRect.bottom - clientRect.top || media.height || 0;
      }
    }
    this.clientRect = boundsRect;
    return boundsRect;
  }
  get mediaWidth() {
    return this.getDimensions().width * this.contentScaleFactor;
  }
  get mediaHeight() {
    return this.getDimensions().height * this.contentScaleFactor;
  }
  get contentScaleFactor() {
    let pixelRatio = 1;
    if (!this.hls.config.ignoreDevicePixelRatio) {
      try {
        pixelRatio = self.devicePixelRatio;
      } catch (e) {
        /* no-op */
      }
    }
    return pixelRatio;
  }
  isLevelAllowed(level) {
    const restrictedLevels = this.restrictedLevels;
    return !restrictedLevels.some(restrictedLevel => {
      return level.bitrate === restrictedLevel.bitrate && level.width === restrictedLevel.width && level.height === restrictedLevel.height;
    });
  }
  static getMaxLevelByMediaSize(levels, width, height) {
    if (!(levels != null && levels.length)) {
      return -1;
    }

    // Levels can have the same dimensions but differing bandwidths - since levels are ordered, we can look to the next
    // to determine whether we've chosen the greatest bandwidth for the media's dimensions
    const atGreatestBandwidth = (curLevel, nextLevel) => {
      if (!nextLevel) {
        return true;
      }
      return curLevel.width !== nextLevel.width || curLevel.height !== nextLevel.height;
    };

    // If we run through the loop without breaking, the media's dimensions are greater than every level, so default to
    // the max level
    let maxLevelIndex = levels.length - 1;
    for (let i = 0; i < levels.length; i += 1) {
      const level = levels[i];
      if ((level.width >= width || level.height >= height) && atGreatestBandwidth(level, levels[i + 1])) {
        maxLevelIndex = i;
        break;
      }
    }
    return maxLevelIndex;
  }
}

class FPSController {
  // stream controller must be provided as a dependency!

  constructor(hls) {
    this.hls = void 0;
    this.isVideoPlaybackQualityAvailable = false;
    this.timer = void 0;
    this.media = null;
    this.lastTime = void 0;
    this.lastDroppedFrames = 0;
    this.lastDecodedFrames = 0;
    this.streamController = void 0;
    this.hls = hls;
    this.registerListeners();
  }
  setStreamController(streamController) {
    this.streamController = streamController;
  }
  registerListeners() {
    this.hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
  }
  unregisterListeners() {
    this.hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
  }
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.unregisterListeners();
    this.isVideoPlaybackQualityAvailable = false;
    this.media = null;
  }
  onMediaAttaching(event, data) {
    const config = this.hls.config;
    if (config.capLevelOnFPSDrop) {
      const media = data.media instanceof self.HTMLVideoElement ? data.media : null;
      this.media = media;
      if (media && typeof media.getVideoPlaybackQuality === 'function') {
        this.isVideoPlaybackQualityAvailable = true;
      }
      self.clearInterval(this.timer);
      this.timer = self.setInterval(this.checkFPSInterval.bind(this), config.fpsDroppedMonitoringPeriod);
    }
  }
  checkFPS(video, decodedFrames, droppedFrames) {
    const currentTime = performance.now();
    if (decodedFrames) {
      if (this.lastTime) {
        const currentPeriod = currentTime - this.lastTime;
        const currentDropped = droppedFrames - this.lastDroppedFrames;
        const currentDecoded = decodedFrames - this.lastDecodedFrames;
        const droppedFPS = 1000 * currentDropped / currentPeriod;
        const hls = this.hls;
        hls.trigger(Events.FPS_DROP, {
          currentDropped: currentDropped,
          currentDecoded: currentDecoded,
          totalDroppedFrames: droppedFrames
        });
        if (droppedFPS > 0) {
          // logger.log('checkFPS : droppedFPS/decodedFPS:' + droppedFPS/(1000 * currentDecoded / currentPeriod));
          if (currentDropped > hls.config.fpsDroppedMonitoringThreshold * currentDecoded) {
            let currentLevel = hls.currentLevel;
            logger.warn('drop FPS ratio greater than max allowed value for currentLevel: ' + currentLevel);
            if (currentLevel > 0 && (hls.autoLevelCapping === -1 || hls.autoLevelCapping >= currentLevel)) {
              currentLevel = currentLevel - 1;
              hls.trigger(Events.FPS_DROP_LEVEL_CAPPING, {
                level: currentLevel,
                droppedLevel: hls.currentLevel
              });
              hls.autoLevelCapping = currentLevel;
              this.streamController.nextLevelSwitch();
            }
          }
        }
      }
      this.lastTime = currentTime;
      this.lastDroppedFrames = droppedFrames;
      this.lastDecodedFrames = decodedFrames;
    }
  }
  checkFPSInterval() {
    const video = this.media;
    if (video) {
      if (this.isVideoPlaybackQualityAvailable) {
        const videoPlaybackQuality = video.getVideoPlaybackQuality();
        this.checkFPS(video, videoPlaybackQuality.totalVideoFrames, videoPlaybackQuality.droppedVideoFrames);
      } else {
        // HTMLVideoElement doesn't include the webkit types
        this.checkFPS(video, video.webkitDecodedFrameCount, video.webkitDroppedFrameCount);
      }
    }
  }
}

const LOGGER_PREFIX = '[eme]';
/**
 * Controller to deal with encrypted media extensions (EME)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
 *
 * @class
 * @constructor
 */
class EMEController {
  constructor(hls) {
    this.hls = void 0;
    this.config = void 0;
    this.media = null;
    this.keyFormatPromise = null;
    this.keySystemAccessPromises = {};
    this._requestLicenseFailureCount = 0;
    this.mediaKeySessions = [];
    this.keyIdToKeySessionPromise = {};
    this.setMediaKeysQueue = EMEController.CDMCleanupPromise ? [EMEController.CDMCleanupPromise] : [];
    this.onMediaEncrypted = this._onMediaEncrypted.bind(this);
    this.onWaitingForKey = this._onWaitingForKey.bind(this);
    this.debug = logger.debug.bind(logger, LOGGER_PREFIX);
    this.log = logger.log.bind(logger, LOGGER_PREFIX);
    this.warn = logger.warn.bind(logger, LOGGER_PREFIX);
    this.error = logger.error.bind(logger, LOGGER_PREFIX);
    this.hls = hls;
    this.config = hls.config;
    this.registerListeners();
  }
  destroy() {
    this.unregisterListeners();
    this.onMediaDetached();
    // Remove any references that could be held in config options or callbacks
    const config = this.config;
    config.requestMediaKeySystemAccessFunc = null;
    config.licenseXhrSetup = config.licenseResponseCallback = undefined;
    config.drmSystems = config.drmSystemOptions = {};
    // @ts-ignore
    this.hls = this.onMediaEncrypted = this.onWaitingForKey = this.keyIdToKeySessionPromise = null;
    // @ts-ignore
    this.config = null;
  }
  registerListeners() {
    this.hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.on(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    this.hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
  }
  unregisterListeners() {
    this.hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.off(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    this.hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
  }
  getLicenseServerUrl(keySystem) {
    const {
      drmSystems,
      widevineLicenseUrl
    } = this.config;
    const keySystemConfiguration = drmSystems[keySystem];
    if (keySystemConfiguration) {
      return keySystemConfiguration.licenseUrl;
    }

    // For backward compatibility
    if (keySystem === KeySystems.WIDEVINE && widevineLicenseUrl) {
      return widevineLicenseUrl;
    }
    throw new Error(`no license server URL configured for key-system "${keySystem}"`);
  }
  getServerCertificateUrl(keySystem) {
    const {
      drmSystems
    } = this.config;
    const keySystemConfiguration = drmSystems[keySystem];
    if (keySystemConfiguration) {
      return keySystemConfiguration.serverCertificateUrl;
    } else {
      this.log(`No Server Certificate in config.drmSystems["${keySystem}"]`);
    }
  }
  attemptKeySystemAccess(keySystemsToAttempt) {
    const levels = this.hls.levels;
    const uniqueCodec = (value, i, a) => !!value && a.indexOf(value) === i;
    const audioCodecs = levels.map(level => level.audioCodec).filter(uniqueCodec);
    const videoCodecs = levels.map(level => level.videoCodec).filter(uniqueCodec);
    if (audioCodecs.length + videoCodecs.length === 0) {
      videoCodecs.push('avc1.42e01e');
    }
    return new Promise((resolve, reject) => {
      const attempt = keySystems => {
        const keySystem = keySystems.shift();
        this.getMediaKeysPromise(keySystem, audioCodecs, videoCodecs).then(mediaKeys => resolve({
          keySystem,
          mediaKeys
        })).catch(error => {
          if (keySystems.length) {
            attempt(keySystems);
          } else if (error instanceof EMEKeyError) {
            reject(error);
          } else {
            reject(new EMEKeyError({
              type: ErrorTypes.KEY_SYSTEM_ERROR,
              details: ErrorDetails.KEY_SYSTEM_NO_ACCESS,
              error,
              fatal: true
            }, error.message));
          }
        });
      };
      attempt(keySystemsToAttempt);
    });
  }
  requestMediaKeySystemAccess(keySystem, supportedConfigurations) {
    const {
      requestMediaKeySystemAccessFunc
    } = this.config;
    if (!(typeof requestMediaKeySystemAccessFunc === 'function')) {
      let errMessage = `Configured requestMediaKeySystemAccess is not a function ${requestMediaKeySystemAccessFunc}`;
      if (requestMediaKeySystemAccess === null && self.location.protocol === 'http:') {
        errMessage = `navigator.requestMediaKeySystemAccess is not available over insecure protocol ${location.protocol}`;
      }
      return Promise.reject(new Error(errMessage));
    }
    return requestMediaKeySystemAccessFunc(keySystem, supportedConfigurations);
  }
  getMediaKeysPromise(keySystem, audioCodecs, videoCodecs) {
    // This can throw, but is caught in event handler callpath
    const mediaKeySystemConfigs = getSupportedMediaKeySystemConfigurations(keySystem, audioCodecs, videoCodecs, this.config.drmSystemOptions);
    const keySystemAccessPromises = this.keySystemAccessPromises[keySystem];
    let keySystemAccess = keySystemAccessPromises == null ? void 0 : keySystemAccessPromises.keySystemAccess;
    if (!keySystemAccess) {
      this.log(`Requesting encrypted media "${keySystem}" key-system access with config: ${JSON.stringify(mediaKeySystemConfigs)}`);
      keySystemAccess = this.requestMediaKeySystemAccess(keySystem, mediaKeySystemConfigs);
      const _keySystemAccessPromises = this.keySystemAccessPromises[keySystem] = {
        keySystemAccess
      };
      keySystemAccess.catch(error => {
        this.log(`Failed to obtain access to key-system "${keySystem}": ${error}`);
      });
      return keySystemAccess.then(mediaKeySystemAccess => {
        this.log(`Access for key-system "${mediaKeySystemAccess.keySystem}" obtained`);
        const certificateRequest = this.fetchServerCertificate(keySystem);
        this.log(`Create media-keys for "${keySystem}"`);
        _keySystemAccessPromises.mediaKeys = mediaKeySystemAccess.createMediaKeys().then(mediaKeys => {
          this.log(`Media-keys created for "${keySystem}"`);
          return certificateRequest.then(certificate => {
            if (certificate) {
              return this.setMediaKeysServerCertificate(mediaKeys, keySystem, certificate);
            }
            return mediaKeys;
          });
        });
        _keySystemAccessPromises.mediaKeys.catch(error => {
          this.error(`Failed to create media-keys for "${keySystem}"}: ${error}`);
        });
        return _keySystemAccessPromises.mediaKeys;
      });
    }
    return keySystemAccess.then(() => keySystemAccessPromises.mediaKeys);
  }
  createMediaKeySessionContext({
    decryptdata,
    keySystem,
    mediaKeys
  }) {
    this.log(`Creating key-system session "${keySystem}" keyId: ${Hex.hexDump(decryptdata.keyId || [])}`);
    const mediaKeysSession = mediaKeys.createSession();
    const mediaKeySessionContext = {
      decryptdata,
      keySystem,
      mediaKeys,
      mediaKeysSession,
      keyStatus: 'status-pending'
    };
    this.mediaKeySessions.push(mediaKeySessionContext);
    return mediaKeySessionContext;
  }
  renewKeySession(mediaKeySessionContext) {
    const decryptdata = mediaKeySessionContext.decryptdata;
    if (decryptdata.pssh) {
      const keySessionContext = this.createMediaKeySessionContext(mediaKeySessionContext);
      const keyId = this.getKeyIdString(decryptdata);
      const scheme = 'cenc';
      this.keyIdToKeySessionPromise[keyId] = this.generateRequestWithPreferredKeySession(keySessionContext, scheme, decryptdata.pssh, 'expired');
    } else {
      this.warn(`Could not renew expired session. Missing pssh initData.`);
    }
    this.removeSession(mediaKeySessionContext);
  }
  getKeyIdString(decryptdata) {
    if (!decryptdata) {
      throw new Error('Could not read keyId of undefined decryptdata');
    }
    if (decryptdata.keyId === null) {
      throw new Error('keyId is null');
    }
    return Hex.hexDump(decryptdata.keyId);
  }
  updateKeySession(mediaKeySessionContext, data) {
    var _mediaKeySessionConte;
    const keySession = mediaKeySessionContext.mediaKeysSession;
    this.log(`Updating key-session "${keySession.sessionId}" for keyID ${Hex.hexDump(((_mediaKeySessionConte = mediaKeySessionContext.decryptdata) == null ? void 0 : _mediaKeySessionConte.keyId) || [])}
      } (data length: ${data ? data.byteLength : data})`);
    return keySession.update(data);
  }
  selectKeySystemFormat(frag) {
    const keyFormats = Object.keys(frag.levelkeys || {});
    if (!this.keyFormatPromise) {
      this.log(`Selecting key-system from fragment (sn: ${frag.sn} ${frag.type}: ${frag.level}) key formats ${keyFormats.join(', ')}`);
      this.keyFormatPromise = this.getKeyFormatPromise(keyFormats);
    }
    return this.keyFormatPromise;
  }
  getKeyFormatPromise(keyFormats) {
    return new Promise((resolve, reject) => {
      const keySystemsInConfig = getKeySystemsForConfig(this.config);
      const keySystemsToAttempt = keyFormats.map(keySystemFormatToKeySystemDomain).filter(value => !!value && keySystemsInConfig.indexOf(value) !== -1);
      return this.getKeySystemSelectionPromise(keySystemsToAttempt).then(({
        keySystem
      }) => {
        const keySystemFormat = keySystemDomainToKeySystemFormat(keySystem);
        if (keySystemFormat) {
          resolve(keySystemFormat);
        } else {
          reject(new Error(`Unable to find format for key-system "${keySystem}"`));
        }
      }).catch(reject);
    });
  }
  loadKey(data) {
    const decryptdata = data.keyInfo.decryptdata;
    const keyId = this.getKeyIdString(decryptdata);
    const keyDetails = `(keyId: ${keyId} format: "${decryptdata.keyFormat}" method: ${decryptdata.method} uri: ${decryptdata.uri})`;
    this.log(`Starting session for key ${keyDetails}`);
    let keySessionContextPromise = this.keyIdToKeySessionPromise[keyId];
    if (!keySessionContextPromise) {
      keySessionContextPromise = this.keyIdToKeySessionPromise[keyId] = this.getKeySystemForKeyPromise(decryptdata).then(({
        keySystem,
        mediaKeys
      }) => {
        this.throwIfDestroyed();
        this.log(`Handle encrypted media sn: ${data.frag.sn} ${data.frag.type}: ${data.frag.level} using key ${keyDetails}`);
        return this.attemptSetMediaKeys(keySystem, mediaKeys).then(() => {
          this.throwIfDestroyed();
          const keySessionContext = this.createMediaKeySessionContext({
            keySystem,
            mediaKeys,
            decryptdata
          });
          const scheme = 'cenc';
          return this.generateRequestWithPreferredKeySession(keySessionContext, scheme, decryptdata.pssh, 'playlist-key');
        });
      });
      keySessionContextPromise.catch(error => this.handleError(error));
    }
    return keySessionContextPromise;
  }
  throwIfDestroyed(message = 'Invalid state') {
    if (!this.hls) {
      throw new Error('invalid state');
    }
  }
  handleError(error) {
    if (!this.hls) {
      return;
    }
    this.error(error.message);
    if (error instanceof EMEKeyError) {
      this.hls.trigger(Events.ERROR, error.data);
    } else {
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.KEY_SYSTEM_ERROR,
        details: ErrorDetails.KEY_SYSTEM_NO_KEYS,
        error,
        fatal: true
      });
    }
  }
  getKeySystemForKeyPromise(decryptdata) {
    const keyId = this.getKeyIdString(decryptdata);
    const mediaKeySessionContext = this.keyIdToKeySessionPromise[keyId];
    if (!mediaKeySessionContext) {
      const keySystem = keySystemFormatToKeySystemDomain(decryptdata.keyFormat);
      const keySystemsToAttempt = keySystem ? [keySystem] : getKeySystemsForConfig(this.config);
      return this.attemptKeySystemAccess(keySystemsToAttempt);
    }
    return mediaKeySessionContext;
  }
  getKeySystemSelectionPromise(keySystemsToAttempt) {
    if (!keySystemsToAttempt.length) {
      keySystemsToAttempt = getKeySystemsForConfig(this.config);
    }
    if (keySystemsToAttempt.length === 0) {
      throw new EMEKeyError({
        type: ErrorTypes.KEY_SYSTEM_ERROR,
        details: ErrorDetails.KEY_SYSTEM_NO_CONFIGURED_LICENSE,
        fatal: true
      }, `Missing key-system license configuration options ${JSON.stringify({
        drmSystems: this.config.drmSystems
      })}`);
    }
    return this.attemptKeySystemAccess(keySystemsToAttempt);
  }
  _onMediaEncrypted(event) {
    const {
      initDataType,
      initData
    } = event;
    this.debug(`"${event.type}" event: init data type: "${initDataType}"`);

    // Ignore event when initData is null
    if (initData === null) {
      return;
    }
    let keyId;
    let keySystemDomain;
    if (initDataType === 'sinf' && this.config.drmSystems[KeySystems.FAIRPLAY]) {
      // Match sinf keyId to playlist skd://keyId=
      const json = bin2str(new Uint8Array(initData));
      try {
        const sinf = base64Decode(JSON.parse(json).sinf);
        const tenc = parseSinf(new Uint8Array(sinf));
        if (!tenc) {
          return;
        }
        keyId = tenc.subarray(8, 24);
        keySystemDomain = KeySystems.FAIRPLAY;
      } catch (error) {
        this.warn('Failed to parse sinf "encrypted" event message initData');
        return;
      }
    } else {
      // Support clear-lead key-session creation (otherwise depend on playlist keys)
      const psshInfo = parsePssh(initData);
      if (psshInfo === null) {
        return;
      }
      if (psshInfo.version === 0 && psshInfo.systemId === KeySystemIds.WIDEVINE && psshInfo.data) {
        keyId = psshInfo.data.subarray(8, 24);
      }
      keySystemDomain = keySystemIdToKeySystemDomain(psshInfo.systemId);
    }
    if (!keySystemDomain || !keyId) {
      return;
    }
    const keyIdHex = Hex.hexDump(keyId);
    const {
      keyIdToKeySessionPromise,
      mediaKeySessions
    } = this;
    let keySessionContextPromise = keyIdToKeySessionPromise[keyIdHex];
    for (let i = 0; i < mediaKeySessions.length; i++) {
      // Match playlist key
      const keyContext = mediaKeySessions[i];
      const decryptdata = keyContext.decryptdata;
      if (decryptdata.pssh || !decryptdata.keyId) {
        continue;
      }
      const oldKeyIdHex = Hex.hexDump(decryptdata.keyId);
      if (keyIdHex === oldKeyIdHex || decryptdata.uri.replace(/-/g, '').indexOf(keyIdHex) !== -1) {
        keySessionContextPromise = keyIdToKeySessionPromise[oldKeyIdHex];
        delete keyIdToKeySessionPromise[oldKeyIdHex];
        decryptdata.pssh = new Uint8Array(initData);
        decryptdata.keyId = keyId;
        keySessionContextPromise = keyIdToKeySessionPromise[keyIdHex] = keySessionContextPromise.then(() => {
          return this.generateRequestWithPreferredKeySession(keyContext, initDataType, initData, 'encrypted-event-key-match');
        });
        break;
      }
    }
    if (!keySessionContextPromise) {
      // Clear-lead key (not encountered in playlist)
      keySessionContextPromise = keyIdToKeySessionPromise[keyIdHex] = this.getKeySystemSelectionPromise([keySystemDomain]).then(({
        keySystem,
        mediaKeys
      }) => {
        var _keySystemToKeySystem;
        this.throwIfDestroyed();
        const decryptdata = new LevelKey('ISO-23001-7', keyIdHex, (_keySystemToKeySystem = keySystemDomainToKeySystemFormat(keySystem)) != null ? _keySystemToKeySystem : '');
        decryptdata.pssh = new Uint8Array(initData);
        decryptdata.keyId = keyId;
        return this.attemptSetMediaKeys(keySystem, mediaKeys).then(() => {
          this.throwIfDestroyed();
          const keySessionContext = this.createMediaKeySessionContext({
            decryptdata,
            keySystem,
            mediaKeys
          });
          return this.generateRequestWithPreferredKeySession(keySessionContext, initDataType, initData, 'encrypted-event-no-match');
        });
      });
    }
    keySessionContextPromise.catch(error => this.handleError(error));
  }
  _onWaitingForKey(event) {
    this.log(`"${event.type}" event`);
  }
  attemptSetMediaKeys(keySystem, mediaKeys) {
    const queue = this.setMediaKeysQueue.slice();
    this.log(`Setting media-keys for "${keySystem}"`);
    // Only one setMediaKeys() can run at one time, and multiple setMediaKeys() operations
    // can be queued for execution for multiple key sessions.
    const setMediaKeysPromise = Promise.all(queue).then(() => {
      if (!this.media) {
        throw new Error('Attempted to set mediaKeys without media element attached');
      }
      return this.media.setMediaKeys(mediaKeys);
    });
    this.setMediaKeysQueue.push(setMediaKeysPromise);
    return setMediaKeysPromise.then(() => {
      this.log(`Media-keys set for "${keySystem}"`);
      queue.push(setMediaKeysPromise);
      this.setMediaKeysQueue = this.setMediaKeysQueue.filter(p => queue.indexOf(p) === -1);
    });
  }
  generateRequestWithPreferredKeySession(context, initDataType, initData, reason) {
    var _this$config$drmSyste, _this$config$drmSyste2;
    const generateRequestFilter = (_this$config$drmSyste = this.config.drmSystems) == null ? void 0 : (_this$config$drmSyste2 = _this$config$drmSyste[context.keySystem]) == null ? void 0 : _this$config$drmSyste2.generateRequest;
    if (generateRequestFilter) {
      try {
        const mappedInitData = generateRequestFilter.call(this.hls, initDataType, initData, context);
        if (!mappedInitData) {
          throw new Error('Invalid response from configured generateRequest filter');
        }
        initDataType = mappedInitData.initDataType;
        initData = context.decryptdata.pssh = mappedInitData.initData ? new Uint8Array(mappedInitData.initData) : null;
      } catch (error) {
        var _this$hls;
        this.warn(error.message);
        if ((_this$hls = this.hls) != null && _this$hls.config.debug) {
          throw error;
        }
      }
    }
    if (initData === null) {
      this.log(`Skipping key-session request for "${reason}" (no initData)`);
      return Promise.resolve(context);
    }
    const keyId = this.getKeyIdString(context.decryptdata);
    this.log(`Generating key-session request for "${reason}": ${keyId} (init data type: ${initDataType} length: ${initData ? initData.byteLength : null})`);
    const licenseStatus = new EventEmitter();
    context.mediaKeysSession.onmessage = event => {
      const keySession = context.mediaKeysSession;
      if (!keySession) {
        licenseStatus.emit('error', new Error('invalid state'));
        return;
      }
      const {
        messageType,
        message
      } = event;
      this.log(`"${messageType}" message event for session "${keySession.sessionId}" message size: ${message.byteLength}`);
      if (messageType === 'license-request' || messageType === 'license-renewal') {
        this.renewLicense(context, message).catch(error => {
          this.handleError(error);
          licenseStatus.emit('error', error);
        });
      } else if (messageType === 'license-release') {
        if (context.keySystem === KeySystems.FAIRPLAY) {
          this.updateKeySession(context, strToUtf8array('acknowledged'));
          this.removeSession(context);
        }
      } else {
        this.warn(`unhandled media key message type "${messageType}"`);
      }
    };
    context.mediaKeysSession.onkeystatuseschange = event => {
      const keySession = context.mediaKeysSession;
      if (!keySession) {
        licenseStatus.emit('error', new Error('invalid state'));
        return;
      }
      this.onKeyStatusChange(context);
      const keyStatus = context.keyStatus;
      licenseStatus.emit('keyStatus', keyStatus);
      if (keyStatus === 'expired') {
        this.warn(`${context.keySystem} expired for key ${keyId}`);
        this.renewKeySession(context);
      }
    };
    const keyUsablePromise = new Promise((resolve, reject) => {
      licenseStatus.on('error', reject);
      licenseStatus.on('keyStatus', keyStatus => {
        if (keyStatus.startsWith('usable')) {
          resolve();
        } else if (keyStatus === 'output-restricted') {
          reject(new EMEKeyError({
            type: ErrorTypes.KEY_SYSTEM_ERROR,
            details: ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED,
            fatal: false
          }, 'HDCP level output restricted'));
        } else if (keyStatus === 'internal-error') {
          reject(new EMEKeyError({
            type: ErrorTypes.KEY_SYSTEM_ERROR,
            details: ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR,
            fatal: true
          }, `key status changed to "${keyStatus}"`));
        } else if (keyStatus === 'expired') {
          reject(new Error('key expired while generating request'));
        } else {
          this.warn(`unhandled key status change "${keyStatus}"`);
        }
      });
    });
    return context.mediaKeysSession.generateRequest(initDataType, initData).then(() => {
      var _context$mediaKeysSes;
      this.log(`Request generated for key-session "${(_context$mediaKeysSes = context.mediaKeysSession) == null ? void 0 : _context$mediaKeysSes.sessionId}" keyId: ${keyId}`);
    }).catch(error => {
      throw new EMEKeyError({
        type: ErrorTypes.KEY_SYSTEM_ERROR,
        details: ErrorDetails.KEY_SYSTEM_NO_SESSION,
        error,
        fatal: false
      }, `Error generating key-session request: ${error}`);
    }).then(() => keyUsablePromise).catch(error => {
      licenseStatus.removeAllListeners();
      this.removeSession(context);
      throw error;
    }).then(() => {
      licenseStatus.removeAllListeners();
      return context;
    });
  }
  onKeyStatusChange(mediaKeySessionContext) {
    mediaKeySessionContext.mediaKeysSession.keyStatuses.forEach((status, keyId) => {
      this.log(`key status change "${status}" for keyStatuses keyId: ${Hex.hexDump('buffer' in keyId ? new Uint8Array(keyId.buffer, keyId.byteOffset, keyId.byteLength) : new Uint8Array(keyId))} session keyId: ${Hex.hexDump(new Uint8Array(mediaKeySessionContext.decryptdata.keyId || []))} uri: ${mediaKeySessionContext.decryptdata.uri}`);
      mediaKeySessionContext.keyStatus = status;
    });
  }
  fetchServerCertificate(keySystem) {
    const config = this.config;
    const Loader = config.loader;
    const certLoader = new Loader(config);
    const url = this.getServerCertificateUrl(keySystem);
    if (!url) {
      return Promise.resolve();
    }
    this.log(`Fetching serverCertificate for "${keySystem}"`);
    return new Promise((resolve, reject) => {
      const loaderContext = {
        responseType: 'arraybuffer',
        url
      };
      const loadPolicy = config.certLoadPolicy.default;
      const loaderConfig = {
        loadPolicy,
        timeout: loadPolicy.maxLoadTimeMs,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: 0
      };
      const loaderCallbacks = {
        onSuccess: (response, stats, context, networkDetails) => {
          resolve(response.data);
        },
        onError: (response, contex, networkDetails, stats) => {
          reject(new EMEKeyError({
            type: ErrorTypes.KEY_SYSTEM_ERROR,
            details: ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,
            fatal: true,
            networkDetails,
            response: _objectSpread2({
              url: loaderContext.url,
              data: undefined
            }, response)
          }, `"${keySystem}" certificate request failed (${url}). Status: ${response.code} (${response.text})`));
        },
        onTimeout: (stats, context, networkDetails) => {
          reject(new EMEKeyError({
            type: ErrorTypes.KEY_SYSTEM_ERROR,
            details: ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,
            fatal: true,
            networkDetails,
            response: {
              url: loaderContext.url,
              data: undefined
            }
          }, `"${keySystem}" certificate request timed out (${url})`));
        },
        onAbort: (stats, context, networkDetails) => {
          reject(new Error('aborted'));
        }
      };
      certLoader.load(loaderContext, loaderConfig, loaderCallbacks);
    });
  }
  setMediaKeysServerCertificate(mediaKeys, keySystem, cert) {
    return new Promise((resolve, reject) => {
      mediaKeys.setServerCertificate(cert).then(success => {
        this.log(`setServerCertificate ${success ? 'success' : 'not supported by CDM'} (${cert == null ? void 0 : cert.byteLength}) on "${keySystem}"`);
        resolve(mediaKeys);
      }).catch(error => {
        reject(new EMEKeyError({
          type: ErrorTypes.KEY_SYSTEM_ERROR,
          details: ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED,
          error,
          fatal: true
        }, error.message));
      });
    });
  }
  renewLicense(context, keyMessage) {
    return this.requestLicense(context, new Uint8Array(keyMessage)).then(data => {
      return this.updateKeySession(context, new Uint8Array(data)).catch(error => {
        throw new EMEKeyError({
          type: ErrorTypes.KEY_SYSTEM_ERROR,
          details: ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED,
          error,
          fatal: true
        }, error.message);
      });
    });
  }
  setupLicenseXHR(xhr, url, keysListItem, licenseChallenge) {
    const licenseXhrSetup = this.config.licenseXhrSetup;
    if (!licenseXhrSetup) {
      xhr.open('POST', url, true);
      return Promise.resolve({
        xhr,
        licenseChallenge
      });
    }
    return Promise.resolve().then(() => {
      if (!keysListItem.decryptdata) {
        throw new Error('Key removed');
      }
      return licenseXhrSetup.call(this.hls, xhr, url, keysListItem, licenseChallenge);
    }).catch(error => {
      if (!keysListItem.decryptdata) {
        // Key session removed. Cancel license request.
        throw error;
      }
      // let's try to open before running setup
      xhr.open('POST', url, true);
      return licenseXhrSetup.call(this.hls, xhr, url, keysListItem, licenseChallenge);
    }).then(licenseXhrSetupResult => {
      // if licenseXhrSetup did not yet call open, let's do it now
      if (!xhr.readyState) {
        xhr.open('POST', url, true);
      }
      const finalLicenseChallenge = licenseXhrSetupResult ? licenseXhrSetupResult : licenseChallenge;
      return {
        xhr,
        licenseChallenge: finalLicenseChallenge
      };
    });
  }
  requestLicense(keySessionContext, licenseChallenge) {
    const keyLoadPolicy = this.config.keyLoadPolicy.default;
    return new Promise((resolve, reject) => {
      const url = this.getLicenseServerUrl(keySessionContext.keySystem);
      this.log(`Sending license request to URL: ${url}`);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onreadystatechange = () => {
        if (!this.hls || !keySessionContext.mediaKeysSession) {
          return reject(new Error('invalid state'));
        }
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            this._requestLicenseFailureCount = 0;
            let data = xhr.response;
            this.log(`License received ${data instanceof ArrayBuffer ? data.byteLength : data}`);
            const licenseResponseCallback = this.config.licenseResponseCallback;
            if (licenseResponseCallback) {
              try {
                data = licenseResponseCallback.call(this.hls, xhr, url, keySessionContext);
              } catch (error) {
                this.error(error);
              }
            }
            resolve(data);
          } else {
            const retryConfig = keyLoadPolicy.errorRetry;
            const maxNumRetry = retryConfig ? retryConfig.maxNumRetry : 0;
            this._requestLicenseFailureCount++;
            if (this._requestLicenseFailureCount > maxNumRetry || xhr.status >= 400 && xhr.status < 500) {
              reject(new EMEKeyError({
                type: ErrorTypes.KEY_SYSTEM_ERROR,
                details: ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,
                fatal: true,
                networkDetails: xhr,
                response: {
                  url,
                  data: undefined,
                  code: xhr.status,
                  text: xhr.statusText
                }
              }, `License Request XHR failed (${url}). Status: ${xhr.status} (${xhr.statusText})`));
            } else {
              const attemptsLeft = maxNumRetry - this._requestLicenseFailureCount + 1;
              this.warn(`Retrying license request, ${attemptsLeft} attempts left`);
              this.requestLicense(keySessionContext, licenseChallenge).then(resolve, reject);
            }
          }
        }
      };
      if (keySessionContext.licenseXhr && keySessionContext.licenseXhr.readyState !== XMLHttpRequest.DONE) {
        keySessionContext.licenseXhr.abort();
      }
      keySessionContext.licenseXhr = xhr;
      this.setupLicenseXHR(xhr, url, keySessionContext, licenseChallenge).then(({
        xhr,
        licenseChallenge
      }) => {
        xhr.send(licenseChallenge);
      });
    });
  }
  onMediaAttached(event, data) {
    if (!this.config.emeEnabled) {
      return;
    }
    const media = data.media;

    // keep reference of media
    this.media = media;
    media.addEventListener('encrypted', this.onMediaEncrypted);
    media.addEventListener('waitingforkey', this.onWaitingForKey);
  }
  onMediaDetached() {
    const media = this.media;
    const mediaKeysList = this.mediaKeySessions;
    if (media) {
      media.removeEventListener('encrypted', this.onMediaEncrypted);
      media.removeEventListener('waitingforkey', this.onWaitingForKey);
      this.media = null;
    }
    this._requestLicenseFailureCount = 0;
    this.setMediaKeysQueue = [];
    this.mediaKeySessions = [];
    this.keyIdToKeySessionPromise = {};
    LevelKey.clearKeyUriToKeyIdMap();

    // Close all sessions and remove media keys from the video element.
    const keySessionCount = mediaKeysList.length;
    EMEController.CDMCleanupPromise = Promise.all(mediaKeysList.map(mediaKeySessionContext => this.removeSession(mediaKeySessionContext)).concat(media == null ? void 0 : media.setMediaKeys(null).catch(error => {
      this.log(`Could not clear media keys: ${error}. media.src: ${media == null ? void 0 : media.src}`);
    }))).then(() => {
      if (keySessionCount) {
        this.log('finished closing key sessions and clearing media keys');
        mediaKeysList.length = 0;
      }
    }).catch(error => {
      this.log(`Could not close sessions and clear media keys: ${error}. media.src: ${media == null ? void 0 : media.src}`);
    });
  }
  onManifestLoading() {
    this.keyFormatPromise = null;
  }
  onManifestLoaded(event, {
    sessionKeys
  }) {
    if (!sessionKeys || !this.config.emeEnabled) {
      return;
    }
    if (!this.keyFormatPromise) {
      const keyFormats = sessionKeys.reduce((formats, sessionKey) => {
        if (formats.indexOf(sessionKey.keyFormat) === -1) {
          formats.push(sessionKey.keyFormat);
        }
        return formats;
      }, []);
      this.log(`Selecting key-system from session-keys ${keyFormats.join(', ')}`);
      this.keyFormatPromise = this.getKeyFormatPromise(keyFormats);
    }
  }
  removeSession(mediaKeySessionContext) {
    const {
      mediaKeysSession,
      licenseXhr
    } = mediaKeySessionContext;
    if (mediaKeysSession) {
      this.log(`Remove licenses and keys and close session ${mediaKeysSession.sessionId}`);
      mediaKeysSession.onmessage = null;
      mediaKeysSession.onkeystatuseschange = null;
      if (licenseXhr && licenseXhr.readyState !== XMLHttpRequest.DONE) {
        licenseXhr.abort();
      }
      mediaKeySessionContext.mediaKeysSession = mediaKeySessionContext.decryptdata = mediaKeySessionContext.licenseXhr = undefined;
      const index = this.mediaKeySessions.indexOf(mediaKeySessionContext);
      if (index > -1) {
        this.mediaKeySessions.splice(index, 1);
      }
      return mediaKeysSession.remove().catch(error => {
        this.log(`Could not remove session: ${error}`);
      }).then(() => {
        return mediaKeysSession.close();
      }).catch(error => {
        this.log(`Could not close session: ${error}`);
      });
    }
  }
}
EMEController.CDMCleanupPromise = void 0;
class EMEKeyError extends Error {
  constructor(data, message) {
    super(message);
    this.data = void 0;
    data.error || (data.error = new Error(message));
    this.data = data;
    data.err = data.error;
  }
}

/**
 * CMCD spec version
 */
const CMCDVersion = 1;

/**
 * CMCD Object Type
 */
var CMCDObjectType = {
  MANIFEST: "m",
  AUDIO: "a",
  VIDEO: "v",
  MUXED: "av",
  INIT: "i",
  CAPTION: "c",
  TIMED_TEXT: "tt",
  KEY: "k",
  OTHER: "o"
};

/**
 * CMCD Streaming Format
 */
const CMCDStreamingFormatHLS = 'h';

/**
 * CMCD Streaming Type
 */

/**
 * CMCD Headers
 */

/**
 * CMCD
 */

/**
 * Controller to deal with Common Media Client Data (CMCD)
 * @see https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf
 */
class CMCDController {
  // eslint-disable-line no-restricted-globals
  // eslint-disable-line no-restricted-globals

  constructor(hls) {
    this.hls = void 0;
    this.config = void 0;
    this.media = void 0;
    this.sid = void 0;
    this.cid = void 0;
    this.useHeaders = false;
    this.initialized = false;
    this.starved = false;
    this.buffering = true;
    this.audioBuffer = void 0;
    this.videoBuffer = void 0;
    this.onWaiting = () => {
      if (this.initialized) {
        this.starved = true;
      }
      this.buffering = true;
    };
    this.onPlaying = () => {
      if (!this.initialized) {
        this.initialized = true;
      }
      this.buffering = false;
    };
    /**
     * Apply CMCD data to a manifest request.
     */
    this.applyPlaylistData = context => {
      try {
        this.apply(context, {
          ot: CMCDObjectType.MANIFEST,
          su: !this.initialized
        });
      } catch (error) {
        logger.warn('Could not generate manifest CMCD data.', error);
      }
    };
    /**
     * Apply CMCD data to a segment request
     */
    this.applyFragmentData = context => {
      try {
        const fragment = context.frag;
        const level = this.hls.levels[fragment.level];
        const ot = this.getObjectType(fragment);
        const data = {
          d: fragment.duration * 1000,
          ot
        };
        if (ot === CMCDObjectType.VIDEO || ot === CMCDObjectType.AUDIO || ot == CMCDObjectType.MUXED) {
          data.br = level.bitrate / 1000;
          data.tb = this.getTopBandwidth(ot) / 1000;
          data.bl = this.getBufferLength(ot);
        }
        this.apply(context, data);
      } catch (error) {
        logger.warn('Could not generate segment CMCD data.', error);
      }
    };
    this.hls = hls;
    const config = this.config = hls.config;
    const {
      cmcd
    } = config;
    if (cmcd != null) {
      config.pLoader = this.createPlaylistLoader();
      config.fLoader = this.createFragmentLoader();
      this.sid = cmcd.sessionId || CMCDController.uuid();
      this.cid = cmcd.contentId;
      this.useHeaders = cmcd.useHeaders === true;
      this.registerListeners();
    }
  }
  registerListeners() {
    const hls = this.hls;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
  }
  unregisterListeners() {
    const hls = this.hls;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
  }
  destroy() {
    this.unregisterListeners();
    this.onMediaDetached();

    // @ts-ignore
    this.hls = this.config = this.audioBuffer = this.videoBuffer = null;
  }
  onMediaAttached(event, data) {
    this.media = data.media;
    this.media.addEventListener('waiting', this.onWaiting);
    this.media.addEventListener('playing', this.onPlaying);
  }
  onMediaDetached() {
    if (!this.media) {
      return;
    }
    this.media.removeEventListener('waiting', this.onWaiting);
    this.media.removeEventListener('playing', this.onPlaying);

    // @ts-ignore
    this.media = null;
  }
  onBufferCreated(event, data) {
    var _data$tracks$audio, _data$tracks$video;
    this.audioBuffer = (_data$tracks$audio = data.tracks.audio) == null ? void 0 : _data$tracks$audio.buffer;
    this.videoBuffer = (_data$tracks$video = data.tracks.video) == null ? void 0 : _data$tracks$video.buffer;
  }
  /**
   * Create baseline CMCD data
   */
  createData() {
    var _this$media;
    return {
      v: CMCDVersion,
      sf: CMCDStreamingFormatHLS,
      sid: this.sid,
      cid: this.cid,
      pr: (_this$media = this.media) == null ? void 0 : _this$media.playbackRate,
      mtp: this.hls.bandwidthEstimate / 1000
    };
  }

  /**
   * Apply CMCD data to a request.
   */
  apply(context, data = {}) {
    // apply baseline data
    _extends(data, this.createData());
    const isVideo = data.ot === CMCDObjectType.INIT || data.ot === CMCDObjectType.VIDEO || data.ot === CMCDObjectType.MUXED;
    if (this.starved && isVideo) {
      data.bs = true;
      data.su = true;
      this.starved = false;
    }
    if (data.su == null) {
      data.su = this.buffering;
    }

    // TODO: Implement rtp, nrr, nor, dl

    if (this.useHeaders) {
      const headers = CMCDController.toHeaders(data);
      if (!Object.keys(headers).length) {
        return;
      }
      if (!context.headers) {
        context.headers = {};
      }
      _extends(context.headers, headers);
    } else {
      const query = CMCDController.toQuery(data);
      if (!query) {
        return;
      }
      context.url = CMCDController.appendQueryToUri(context.url, query);
    }
  }
  /**
   * The CMCD object type.
   */
  getObjectType(fragment) {
    const {
      type
    } = fragment;
    if (type === 'subtitle') {
      return CMCDObjectType.TIMED_TEXT;
    }
    if (fragment.sn === 'initSegment') {
      return CMCDObjectType.INIT;
    }
    if (type === 'audio') {
      return CMCDObjectType.AUDIO;
    }
    if (type === 'main') {
      if (!this.hls.audioTracks.length) {
        return CMCDObjectType.MUXED;
      }
      return CMCDObjectType.VIDEO;
    }
    return undefined;
  }

  /**
   * Get the highest bitrate.
   */
  getTopBandwidth(type) {
    let bitrate = 0;
    let levels;
    const hls = this.hls;
    if (type === CMCDObjectType.AUDIO) {
      levels = hls.audioTracks;
    } else {
      const max = hls.maxAutoLevel;
      const len = max > -1 ? max + 1 : hls.levels.length;
      levels = hls.levels.slice(0, len);
    }
    for (const level of levels) {
      if (level.bitrate > bitrate) {
        bitrate = level.bitrate;
      }
    }
    return bitrate > 0 ? bitrate : NaN;
  }

  /**
   * Get the buffer length for a media type in milliseconds
   */
  getBufferLength(type) {
    const media = this.hls.media;
    const buffer = type === CMCDObjectType.AUDIO ? this.audioBuffer : this.videoBuffer;
    if (!buffer || !media) {
      return NaN;
    }
    const info = BufferHelper.bufferInfo(buffer, media.currentTime, this.config.maxBufferHole);
    return info.len * 1000;
  }

  /**
   * Create a playlist loader
   */
  createPlaylistLoader() {
    const {
      pLoader
    } = this.config;
    const apply = this.applyPlaylistData;
    const Ctor = pLoader || this.config.loader;
    return class CmcdPlaylistLoader {
      constructor(config) {
        this.loader = void 0;
        this.loader = new Ctor(config);
      }
      get stats() {
        return this.loader.stats;
      }
      get context() {
        return this.loader.context;
      }
      destroy() {
        this.loader.destroy();
      }
      abort() {
        this.loader.abort();
      }
      load(context, config, callbacks) {
        apply(context);
        this.loader.load(context, config, callbacks);
      }
    };
  }

  /**
   * Create a playlist loader
   */
  createFragmentLoader() {
    const {
      fLoader
    } = this.config;
    const apply = this.applyFragmentData;
    const Ctor = fLoader || this.config.loader;
    return class CmcdFragmentLoader {
      constructor(config) {
        this.loader = void 0;
        this.loader = new Ctor(config);
      }
      get stats() {
        return this.loader.stats;
      }
      get context() {
        return this.loader.context;
      }
      destroy() {
        this.loader.destroy();
      }
      abort() {
        this.loader.abort();
      }
      load(context, config, callbacks) {
        apply(context);
        this.loader.load(context, config, callbacks);
      }
    };
  }

  /**
   * Generate a random v4 UUI
   *
   * @returns {string}
   */
  static uuid() {
    const url = URL.createObjectURL(new Blob());
    const uuid = url.toString();
    URL.revokeObjectURL(url);
    return uuid.slice(uuid.lastIndexOf('/') + 1);
  }

  /**
   * Serialize a CMCD data object according to the rules defined in the
   * section 3.2 of
   * [CTA-5004](https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf).
   */
  static serialize(data) {
    const results = [];
    const isValid = value => !Number.isNaN(value) && value != null && value !== '' && value !== false;
    const toRounded = value => Math.round(value);
    const toHundred = value => toRounded(value / 100) * 100;
    const toUrlSafe = value => encodeURIComponent(value);
    const formatters = {
      br: toRounded,
      d: toRounded,
      bl: toHundred,
      dl: toHundred,
      mtp: toHundred,
      nor: toUrlSafe,
      rtp: toHundred,
      tb: toRounded
    };
    const keys = Object.keys(data || {}).sort();
    for (const key of keys) {
      let value = data[key];

      // ignore invalid values
      if (!isValid(value)) {
        continue;
      }

      // Version should only be reported if not equal to 1.
      if (key === 'v' && value === 1) {
        continue;
      }

      // Playback rate should only be sent if not equal to 1.
      if (key == 'pr' && value === 1) {
        continue;
      }

      // Certain values require special formatting
      const formatter = formatters[key];
      if (formatter) {
        value = formatter(value);
      }

      // Serialize the key/value pair
      const type = typeof value;
      let result;
      if (key === 'ot' || key === 'sf' || key === 'st') {
        result = `${key}=${value}`;
      } else if (type === 'boolean') {
        result = key;
      } else if (type === 'number') {
        result = `${key}=${value}`;
      } else {
        result = `${key}=${JSON.stringify(value)}`;
      }
      results.push(result);
    }
    return results.join(',');
  }

  /**
   * Convert a CMCD data object to request headers according to the rules
   * defined in the section 2.1 and 3.2 of
   * [CTA-5004](https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf).
   */
  static toHeaders(data) {
    const keys = Object.keys(data);
    const headers = {};
    const headerNames = ['Object', 'Request', 'Session', 'Status'];
    const headerGroups = [{}, {}, {}, {}];
    const headerMap = {
      br: 0,
      d: 0,
      ot: 0,
      tb: 0,
      bl: 1,
      dl: 1,
      mtp: 1,
      nor: 1,
      nrr: 1,
      su: 1,
      cid: 2,
      pr: 2,
      sf: 2,
      sid: 2,
      st: 2,
      v: 2,
      bs: 3,
      rtp: 3
    };
    for (const key of keys) {
      // Unmapped fields are mapped to the Request header
      const index = headerMap[key] != null ? headerMap[key] : 1;
      headerGroups[index][key] = data[key];
    }
    for (let i = 0; i < headerGroups.length; i++) {
      const value = CMCDController.serialize(headerGroups[i]);
      if (value) {
        headers[`CMCD-${headerNames[i]}`] = value;
      }
    }
    return headers;
  }

  /**
   * Convert a CMCD data object to query args according to the rules
   * defined in the section 2.2 and 3.2 of
   * [CTA-5004](https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf).
   */
  static toQuery(data) {
    return `CMCD=${encodeURIComponent(CMCDController.serialize(data))}`;
  }

  /**
   * Append query args to a uri.
   */
  static appendQueryToUri(uri, query) {
    if (!query) {
      return uri;
    }
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}${query}`;
  }
}

const PATHWAY_PENALTY_DURATION_MS = 300000;
class ContentSteeringController {
  constructor(hls) {
    this.hls = void 0;
    this.log = void 0;
    this.loader = null;
    this.uri = null;
    this.pathwayId = '.';
    this.pathwayPriority = null;
    this.timeToLoad = 300;
    this.reloadTimer = -1;
    this.updated = 0;
    this.started = false;
    this.enabled = true;
    this.levels = null;
    this.audioTracks = null;
    this.subtitleTracks = null;
    this.penalizedPathways = {};
    this.hls = hls;
    this.log = logger.log.bind(logger, `[content-steering]:`);
    this.registerListeners();
  }
  registerListeners() {
    const hls = this.hls;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.ERROR, this.onError, this);
  }
  unregisterListeners() {
    const hls = this.hls;
    if (!hls) {
      return;
    }
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.ERROR, this.onError, this);
  }
  startLoad() {
    this.started = true;
    self.clearTimeout(this.reloadTimer);
    if (this.enabled && this.uri) {
      if (this.updated) {
        const ttl = Math.max(this.timeToLoad * 1000 - (performance.now() - this.updated), 0);
        this.scheduleRefresh(this.uri, ttl);
      } else {
        this.loadSteeringManifest(this.uri);
      }
    }
  }
  stopLoad() {
    this.started = false;
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
    self.clearTimeout(this.reloadTimer);
  }
  destroy() {
    this.unregisterListeners();
    this.stopLoad();
    // @ts-ignore
    this.hls = null;
    this.levels = this.audioTracks = this.subtitleTracks = null;
  }
  removeLevel(levelToRemove) {
    const levels = this.levels;
    if (levels) {
      this.levels = levels.filter(level => level !== levelToRemove);
    }
  }
  onManifestLoading() {
    this.stopLoad();
    this.enabled = true;
    this.timeToLoad = 300;
    this.updated = 0;
    this.uri = null;
    this.pathwayId = '.';
    this.levels = this.audioTracks = this.subtitleTracks = null;
  }
  onManifestLoaded(event, data) {
    const {
      contentSteering
    } = data;
    if (contentSteering === null) {
      return;
    }
    this.pathwayId = contentSteering.pathwayId;
    this.uri = contentSteering.uri;
    if (this.started) {
      this.startLoad();
    }
  }
  onManifestParsed(event, data) {
    this.audioTracks = data.audioTracks;
    this.subtitleTracks = data.subtitleTracks;
  }
  onError(event, data) {
    const {
      errorAction
    } = data;
    if ((errorAction == null ? void 0 : errorAction.action) === NetworkErrorAction.SendAlternateToPenaltyBox && errorAction.flags === ErrorActionFlags.MoveAllAlternatesMatchingHost) {
      let pathwayPriority = this.pathwayPriority;
      const pathwayId = this.pathwayId;
      if (!this.penalizedPathways[pathwayId]) {
        this.penalizedPathways[pathwayId] = performance.now();
      }
      if (!pathwayPriority && this.levels) {
        // If PATHWAY-PRIORITY was not provided, list pathways for error handling
        pathwayPriority = this.levels.reduce((pathways, level) => {
          if (pathways.indexOf(level.pathwayId) === -1) {
            pathways.push(level.pathwayId);
          }
          return pathways;
        }, []);
      }
      if (pathwayPriority && pathwayPriority.length > 1) {
        this.updatePathwayPriority(pathwayPriority);
        errorAction.resolved = this.pathwayId !== pathwayId;
      }
    }
  }
  filterParsedLevels(levels) {
    // Filter levels to only include those that are in the initial pathway
    this.levels = levels;
    let pathwayLevels = this.getLevelsForPathway(this.pathwayId);
    if (pathwayLevels.length === 0) {
      const pathwayId = levels[0].pathwayId;
      this.log(`No levels found in Pathway ${this.pathwayId}. Setting initial Pathway to "${pathwayId}"`);
      pathwayLevels = this.getLevelsForPathway(pathwayId);
      this.pathwayId = pathwayId;
    }
    if (pathwayLevels.length !== levels.length) {
      this.log(`Found ${pathwayLevels.length}/${levels.length} levels in Pathway "${this.pathwayId}"`);
      return pathwayLevels;
    }
    return levels;
  }
  getLevelsForPathway(pathwayId) {
    if (this.levels === null) {
      return [];
    }
    return this.levels.filter(level => pathwayId === level.pathwayId);
  }
  updatePathwayPriority(pathwayPriority) {
    this.pathwayPriority = pathwayPriority;
    let levels;

    // Evaluate if we should remove the pathway from the penalized list
    const penalizedPathways = this.penalizedPathways;
    const now = performance.now();
    Object.keys(penalizedPathways).forEach(pathwayId => {
      if (now - penalizedPathways[pathwayId] > PATHWAY_PENALTY_DURATION_MS) {
        delete penalizedPathways[pathwayId];
      }
    });
    for (let i = 0; i < pathwayPriority.length; i++) {
      const pathwayId = pathwayPriority[i];
      if (penalizedPathways[pathwayId]) {
        continue;
      }
      if (pathwayId === this.pathwayId) {
        return;
      }
      const selectedIndex = this.hls.nextLoadLevel;
      const selectedLevel = this.hls.levels[selectedIndex];
      levels = this.getLevelsForPathway(pathwayId);
      if (levels.length > 0) {
        this.log(`Setting Pathway to "${pathwayId}"`);
        this.pathwayId = pathwayId;
        this.hls.trigger(Events.LEVELS_UPDATED, {
          levels
        });
        // Set LevelController's level to trigger LEVEL_SWITCHING which loads playlist if needed
        const levelAfterChange = this.hls.levels[selectedIndex];
        if (selectedLevel && levelAfterChange && this.levels) {
          if (levelAfterChange.attrs['STABLE-VARIANT-ID'] !== selectedLevel.attrs['STABLE-VARIANT-ID'] && levelAfterChange.bitrate !== selectedLevel.bitrate) {
            this.log(`Unstable Pathways change from bitrate ${selectedLevel.bitrate} to ${levelAfterChange.bitrate}`);
          }
          this.hls.nextLoadLevel = selectedIndex;
        }
        break;
      }
    }
  }
  clonePathways(pathwayClones) {
    const levels = this.levels;
    if (!levels) {
      return;
    }
    const audioGroupCloneMap = {};
    const subtitleGroupCloneMap = {};
    pathwayClones.forEach(pathwayClone => {
      const {
        ID: cloneId,
        'BASE-ID': baseId,
        'URI-REPLACEMENT': uriReplacement
      } = pathwayClone;
      if (levels.some(level => level.pathwayId === cloneId)) {
        return;
      }
      const clonedVariants = this.getLevelsForPathway(baseId).map(baseLevel => {
        const levelParsed = _extends({}, baseLevel);
        levelParsed.details = undefined;
        levelParsed.url = performUriReplacement(baseLevel.uri, baseLevel.attrs['STABLE-VARIANT-ID'], 'PER-VARIANT-URIS', uriReplacement);
        const attributes = new AttrList(baseLevel.attrs);
        attributes['PATHWAY-ID'] = cloneId;
        const clonedAudioGroupId = attributes.AUDIO && `${attributes.AUDIO}_clone_${cloneId}`;
        const clonedSubtitleGroupId = attributes.SUBTITLES && `${attributes.SUBTITLES}_clone_${cloneId}`;
        if (clonedAudioGroupId) {
          audioGroupCloneMap[attributes.AUDIO] = clonedAudioGroupId;
          attributes.AUDIO = clonedAudioGroupId;
        }
        if (clonedSubtitleGroupId) {
          subtitleGroupCloneMap[attributes.SUBTITLES] = clonedSubtitleGroupId;
          attributes.SUBTITLES = clonedSubtitleGroupId;
        }
        levelParsed.attrs = attributes;
        const clonedLevel = new Level(levelParsed);
        addGroupId(clonedLevel, 'audio', clonedAudioGroupId);
        addGroupId(clonedLevel, 'text', clonedSubtitleGroupId);
        return clonedLevel;
      });
      levels.push(...clonedVariants);
      cloneRenditionGroups(this.audioTracks, audioGroupCloneMap, uriReplacement, cloneId);
      cloneRenditionGroups(this.subtitleTracks, subtitleGroupCloneMap, uriReplacement, cloneId);
    });
  }
  loadSteeringManifest(uri) {
    const config = this.hls.config;
    const Loader = config.loader;
    if (this.loader) {
      this.loader.destroy();
    }
    this.loader = new Loader(config);
    let url;
    try {
      url = new self.URL(uri);
    } catch (error) {
      this.enabled = false;
      this.log(`Failed to parse Steering Manifest URI: ${uri}`);
      return;
    }
    if (url.protocol !== 'data:') {
      const throughput = (this.hls.bandwidthEstimate || config.abrEwmaDefaultEstimate) | 0;
      url.searchParams.set('_HLS_pathway', this.pathwayId);
      url.searchParams.set('_HLS_throughput', '' + throughput);
    }
    const context = {
      responseType: 'json',
      url: url.href
    };
    const loadPolicy = config.steeringManifestLoadPolicy.default;
    const legacyRetryCompatibility = loadPolicy.errorRetry || loadPolicy.timeoutRetry || {};
    const loaderConfig = {
      loadPolicy,
      timeout: loadPolicy.maxLoadTimeMs,
      maxRetry: legacyRetryCompatibility.maxNumRetry || 0,
      retryDelay: legacyRetryCompatibility.retryDelayMs || 0,
      maxRetryDelay: legacyRetryCompatibility.maxRetryDelayMs || 0
    };
    const callbacks = {
      onSuccess: (response, stats, context, networkDetails) => {
        this.log(`Loaded steering manifest: "${url}"`);
        const steeringData = response.data;
        if (steeringData.VERSION !== 1) {
          this.log(`Steering VERSION ${steeringData.VERSION} not supported!`);
          return;
        }
        this.updated = performance.now();
        this.timeToLoad = steeringData.TTL;
        const {
          'RELOAD-URI': reloadUri,
          'PATHWAY-CLONES': pathwayClones,
          'PATHWAY-PRIORITY': pathwayPriority
        } = steeringData;
        if (reloadUri) {
          try {
            this.uri = new self.URL(reloadUri, url).href;
          } catch (error) {
            this.enabled = false;
            this.log(`Failed to parse Steering Manifest RELOAD-URI: ${reloadUri}`);
            return;
          }
        }
        this.scheduleRefresh(this.uri || context.url);
        if (pathwayClones) {
          this.clonePathways(pathwayClones);
        }
        if (pathwayPriority) {
          this.updatePathwayPriority(pathwayPriority);
        }
      },
      onError: (error, context, networkDetails, stats) => {
        this.log(`Error loading steering manifest: ${error.code} ${error.text} (${context.url})`);
        this.stopLoad();
        if (error.code === 410) {
          this.enabled = false;
          this.log(`Steering manifest ${context.url} no longer available`);
          return;
        }
        let ttl = this.timeToLoad * 1000;
        if (error.code === 429) {
          const loader = this.loader;
          if (typeof (loader == null ? void 0 : loader.getResponseHeader) === 'function') {
            const retryAfter = loader.getResponseHeader('Retry-After');
            if (retryAfter) {
              ttl = parseFloat(retryAfter) * 1000;
            }
          }
          this.log(`Steering manifest ${context.url} rate limited`);
          return;
        }
        this.scheduleRefresh(this.uri || context.url, ttl);
      },
      onTimeout: (stats, context, networkDetails) => {
        this.log(`Timeout loading steering manifest (${context.url})`);
        this.scheduleRefresh(this.uri || context.url);
      }
    };
    this.log(`Requesting steering manifest: ${url}`);
    this.loader.load(context, loaderConfig, callbacks);
  }
  scheduleRefresh(uri, ttlMs = this.timeToLoad * 1000) {
    self.clearTimeout(this.reloadTimer);
    this.reloadTimer = self.setTimeout(() => {
      this.loadSteeringManifest(uri);
    }, ttlMs);
  }
}
function cloneRenditionGroups(tracks, groupCloneMap, uriReplacement, cloneId) {
  if (!tracks) {
    return;
  }
  Object.keys(groupCloneMap).forEach(audioGroupId => {
    const clonedTracks = tracks.filter(track => track.groupId === audioGroupId).map(track => {
      const clonedTrack = _extends({}, track);
      clonedTrack.details = undefined;
      clonedTrack.attrs = new AttrList(clonedTrack.attrs);
      clonedTrack.url = clonedTrack.attrs.URI = performUriReplacement(track.url, track.attrs['STABLE-RENDITION-ID'], 'PER-RENDITION-URIS', uriReplacement);
      clonedTrack.groupId = clonedTrack.attrs['GROUP-ID'] = groupCloneMap[audioGroupId];
      clonedTrack.attrs['PATHWAY-ID'] = cloneId;
      return clonedTrack;
    });
    tracks.push(...clonedTracks);
  });
}
function performUriReplacement(uri, stableId, perOptionKey, uriReplacement) {
  const {
    HOST: host,
    PARAMS: params,
    [perOptionKey]: perOptionUris
  } = uriReplacement;
  let perVariantUri;
  if (stableId) {
    perVariantUri = perOptionUris == null ? void 0 : perOptionUris[stableId];
    if (perVariantUri) {
      uri = perVariantUri;
    }
  }
  const url = new self.URL(uri);
  if (host && !perVariantUri) {
    url.host = host;
  }
  if (params) {
    Object.keys(params).sort().forEach(key => {
      if (key) {
        url.searchParams.set(key, params[key]);
      }
    });
  }
  return url.href;
}

const AGE_HEADER_LINE_REGEX = /^age:\s*[\d.]+\s*$/im;
class XhrLoader {
  constructor(config) {
    this.xhrSetup = void 0;
    this.requestTimeout = void 0;
    this.retryTimeout = void 0;
    this.retryDelay = void 0;
    this.config = null;
    this.callbacks = null;
    this.context = void 0;
    this.loader = null;
    this.stats = void 0;
    this.xhrSetup = config ? config.xhrSetup || null : null;
    this.stats = new LoadStats();
    this.retryDelay = 0;
  }
  destroy() {
    this.callbacks = null;
    this.abortInternal();
    this.loader = null;
    this.config = null;
  }
  abortInternal() {
    const loader = this.loader;
    self.clearTimeout(this.requestTimeout);
    self.clearTimeout(this.retryTimeout);
    if (loader) {
      loader.onreadystatechange = null;
      loader.onprogress = null;
      if (loader.readyState !== 4) {
        this.stats.aborted = true;
        loader.abort();
      }
    }
  }
  abort() {
    var _this$callbacks;
    this.abortInternal();
    if ((_this$callbacks = this.callbacks) != null && _this$callbacks.onAbort) {
      this.callbacks.onAbort(this.stats, this.context, this.loader);
    }
  }
  load(context, config, callbacks) {
    if (this.stats.loading.start) {
      throw new Error('Loader can only be used once.');
    }
    this.stats.loading.start = self.performance.now();
    this.context = context;
    this.config = config;
    this.callbacks = callbacks;
    this.loadInternal();
  }
  loadInternal() {
    const {
      config,
      context
    } = this;
    if (!config) {
      return;
    }
    const xhr = this.loader = new self.XMLHttpRequest();
    const stats = this.stats;
    stats.loading.first = 0;
    stats.loaded = 0;
    stats.aborted = false;
    const xhrSetup = this.xhrSetup;
    if (xhrSetup) {
      Promise.resolve().then(() => {
        if (this.stats.aborted) return;
        return xhrSetup(xhr, context.url);
      }).catch(error => {
        xhr.open('GET', context.url, true);
        return xhrSetup(xhr, context.url);
      }).then(() => {
        if (this.stats.aborted) return;
        this.openAndSendXhr(xhr, context, config);
      }).catch(error => {
        // IE11 throws an exception on xhr.open if attempting to access an HTTP resource over HTTPS
        this.callbacks.onError({
          code: xhr.status,
          text: error.message
        }, context, xhr, stats);
        return;
      });
    } else {
      this.openAndSendXhr(xhr, context, config);
    }
  }
  openAndSendXhr(xhr, context, config) {
    if (!xhr.readyState) {
      xhr.open('GET', context.url, true);
    }
    const headers = this.context.headers;
    const {
      maxTimeToFirstByteMs,
      maxLoadTimeMs
    } = config.loadPolicy;
    if (headers) {
      for (const header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }
    }
    if (context.rangeEnd) {
      xhr.setRequestHeader('Range', 'bytes=' + context.rangeStart + '-' + (context.rangeEnd - 1));
    }
    xhr.onreadystatechange = this.readystatechange.bind(this);
    xhr.onprogress = this.loadprogress.bind(this);
    xhr.responseType = context.responseType;
    // setup timeout before we perform request
    self.clearTimeout(this.requestTimeout);
    config.timeout = maxTimeToFirstByteMs && isFiniteNumber(maxTimeToFirstByteMs) ? maxTimeToFirstByteMs : maxLoadTimeMs;
    this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.timeout);
    xhr.send();
  }
  readystatechange() {
    const {
      context,
      loader: xhr,
      stats
    } = this;
    if (!context || !xhr) {
      return;
    }
    const readyState = xhr.readyState;
    const config = this.config;

    // don't proceed if xhr has been aborted
    if (stats.aborted) {
      return;
    }

    // >= HEADERS_RECEIVED
    if (readyState >= 2) {
      if (stats.loading.first === 0) {
        stats.loading.first = Math.max(self.performance.now(), stats.loading.start);
        // readyState >= 2 AND readyState !==4 (readyState = HEADERS_RECEIVED || LOADING) rearm timeout as xhr not finished yet
        if (config.timeout !== config.loadPolicy.maxLoadTimeMs) {
          self.clearTimeout(this.requestTimeout);
          config.timeout = config.loadPolicy.maxLoadTimeMs;
          this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.loadPolicy.maxLoadTimeMs - (stats.loading.first - stats.loading.start));
        }
      }
      if (readyState === 4) {
        self.clearTimeout(this.requestTimeout);
        xhr.onreadystatechange = null;
        xhr.onprogress = null;
        const status = xhr.status;
        // http status between 200 to 299 are all successful
        const useResponse = xhr.responseType !== 'text';
        if (status >= 200 && status < 300 && (useResponse && xhr.response || xhr.responseText !== null)) {
          stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
          const data = useResponse ? xhr.response : xhr.responseText;
          const len = xhr.responseType === 'arraybuffer' ? data.byteLength : data.length;
          stats.loaded = stats.total = len;
          stats.bwEstimate = stats.total * 8000 / (stats.loading.end - stats.loading.first);
          if (!this.callbacks) {
            return;
          }
          const onProgress = this.callbacks.onProgress;
          if (onProgress) {
            onProgress(stats, context, data, xhr);
          }
          if (!this.callbacks) {
            return;
          }
          const response = {
            url: xhr.responseURL,
            data: data,
            code: status
          };
          this.callbacks.onSuccess(response, stats, context, xhr);
        } else {
          const retryConfig = config.loadPolicy.errorRetry;
          const retryCount = stats.retry;
          // if max nb of retries reached or if http status between 400 and 499 (such error cannot be recovered, retrying is useless), return error
          if (shouldRetry(retryConfig, retryCount, false, status)) {
            this.retry(retryConfig);
          } else {
            logger.error(`${status} while loading ${context.url}`);
            this.callbacks.onError({
              code: status,
              text: xhr.statusText
            }, context, xhr, stats);
          }
        }
      }
    }
  }
  loadtimeout() {
    var _this$config;
    const retryConfig = (_this$config = this.config) == null ? void 0 : _this$config.loadPolicy.timeoutRetry;
    const retryCount = this.stats.retry;
    if (shouldRetry(retryConfig, retryCount, true)) {
      this.retry(retryConfig);
    } else {
      logger.warn(`timeout while loading ${this.context.url}`);
      const callbacks = this.callbacks;
      if (callbacks) {
        this.abortInternal();
        callbacks.onTimeout(this.stats, this.context, this.loader);
      }
    }
  }
  retry(retryConfig) {
    const {
      context,
      stats
    } = this;
    this.retryDelay = getRetryDelay(retryConfig, stats.retry);
    stats.retry++;
    logger.warn(`${status ? 'HTTP Status ' + status : 'Timeout'} while loading ${context.url}, retrying ${stats.retry}/${retryConfig.maxNumRetry} in ${this.retryDelay}ms`);
    // abort and reset internal state
    this.abortInternal();
    this.loader = null;
    // schedule retry
    self.clearTimeout(this.retryTimeout);
    this.retryTimeout = self.setTimeout(this.loadInternal.bind(this), this.retryDelay);
  }
  loadprogress(event) {
    const stats = this.stats;
    stats.loaded = event.loaded;
    if (event.lengthComputable) {
      stats.total = event.total;
    }
  }
  getCacheAge() {
    let result = null;
    if (this.loader && AGE_HEADER_LINE_REGEX.test(this.loader.getAllResponseHeaders())) {
      const ageHeader = this.loader.getResponseHeader('age');
      result = ageHeader ? parseFloat(ageHeader) : null;
    }
    return result;
  }
  getResponseHeader(name) {
    if (this.loader && new RegExp(`^${name}:\\s*[\\d.]+\\s*$`, 'im').test(this.loader.getAllResponseHeaders())) {
      return this.loader.getResponseHeader(name);
    }
    return null;
  }
}

function fetchSupported() {
  if (
  // @ts-ignore
  self.fetch && self.AbortController && self.ReadableStream && self.Request) {
    try {
      new self.ReadableStream({}); // eslint-disable-line no-new
      return true;
    } catch (e) {
      /* noop */
    }
  }
  return false;
}
const BYTERANGE = /(\d+)-(\d+)\/(\d+)/;
class FetchLoader {
  constructor(config /* HlsConfig */) {
    this.fetchSetup = void 0;
    this.requestTimeout = void 0;
    this.request = void 0;
    this.response = void 0;
    this.controller = void 0;
    this.context = void 0;
    this.config = null;
    this.callbacks = null;
    this.stats = void 0;
    this.loader = null;
    this.fetchSetup = config.fetchSetup || getRequest;
    this.controller = new self.AbortController();
    this.stats = new LoadStats();
  }
  destroy() {
    this.loader = this.callbacks = null;
    this.abortInternal();
  }
  abortInternal() {
    const response = this.response;
    if (!(response != null && response.ok)) {
      this.stats.aborted = true;
      this.controller.abort();
    }
  }
  abort() {
    var _this$callbacks;
    this.abortInternal();
    if ((_this$callbacks = this.callbacks) != null && _this$callbacks.onAbort) {
      this.callbacks.onAbort(this.stats, this.context, this.response);
    }
  }
  load(context, config, callbacks) {
    const stats = this.stats;
    if (stats.loading.start) {
      throw new Error('Loader can only be used once.');
    }
    stats.loading.start = self.performance.now();
    const initParams = getRequestParameters(context, this.controller.signal);
    const onProgress = callbacks.onProgress;
    const isArrayBuffer = context.responseType === 'arraybuffer';
    const LENGTH = isArrayBuffer ? 'byteLength' : 'length';
    const {
      maxTimeToFirstByteMs,
      maxLoadTimeMs
    } = config.loadPolicy;
    this.context = context;
    this.config = config;
    this.callbacks = callbacks;
    this.request = this.fetchSetup(context, initParams);
    self.clearTimeout(this.requestTimeout);
    config.timeout = maxTimeToFirstByteMs && isFiniteNumber(maxTimeToFirstByteMs) ? maxTimeToFirstByteMs : maxLoadTimeMs;
    this.requestTimeout = self.setTimeout(() => {
      this.abortInternal();
      callbacks.onTimeout(stats, context, this.response);
    }, config.timeout);
    self.fetch(this.request).then(response => {
      this.response = this.loader = response;
      const first = Math.max(self.performance.now(), stats.loading.start);
      self.clearTimeout(this.requestTimeout);
      config.timeout = maxLoadTimeMs;
      this.requestTimeout = self.setTimeout(() => {
        this.abortInternal();
        callbacks.onTimeout(stats, context, this.response);
      }, maxLoadTimeMs - (first - stats.loading.start));
      if (!response.ok) {
        const {
          status,
          statusText
        } = response;
        throw new FetchError(statusText || 'fetch, bad network response', status, response);
      }
      stats.loading.first = first;
      stats.total = getContentLength(response.headers) || stats.total;
      if (onProgress && isFiniteNumber(config.highWaterMark)) {
        return this.loadProgressively(response, stats, context, config.highWaterMark, onProgress);
      }
      if (isArrayBuffer) {
        return response.arrayBuffer();
      }
      if (context.responseType === 'json') {
        return response.json();
      }
      return response.text();
    }).then(responseData => {
      const {
        response
      } = this;
      self.clearTimeout(this.requestTimeout);
      stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
      const total = responseData[LENGTH];
      if (total) {
        stats.loaded = stats.total = total;
      }
      const loaderResponse = {
        url: response.url,
        data: responseData,
        code: response.status
      };
      if (onProgress && !isFiniteNumber(config.highWaterMark)) {
        onProgress(stats, context, responseData, response);
      }
      callbacks.onSuccess(loaderResponse, stats, context, response);
    }).catch(error => {
      self.clearTimeout(this.requestTimeout);
      if (stats.aborted) {
        return;
      }
      // CORS errors result in an undefined code. Set it to 0 here to align with XHR's behavior
      // when destroying, 'error' itself can be undefined
      const code = !error ? 0 : error.code || 0;
      const text = !error ? null : error.message;
      callbacks.onError({
        code,
        text
      }, context, error ? error.details : null, stats);
    });
  }
  getCacheAge() {
    let result = null;
    if (this.response) {
      const ageHeader = this.response.headers.get('age');
      result = ageHeader ? parseFloat(ageHeader) : null;
    }
    return result;
  }
  getResponseHeader(name) {
    return this.response ? this.response.headers.get(name) : null;
  }
  loadProgressively(response, stats, context, highWaterMark = 0, onProgress) {
    const chunkCache = new ChunkCache();
    const reader = response.body.getReader();
    const pump = () => {
      return reader.read().then(data => {
        if (data.done) {
          if (chunkCache.dataLength) {
            onProgress(stats, context, chunkCache.flush(), response);
          }
          return Promise.resolve(new ArrayBuffer(0));
        }
        const chunk = data.value;
        const len = chunk.length;
        stats.loaded += len;
        if (len < highWaterMark || chunkCache.dataLength) {
          // The current chunk is too small to to be emitted or the cache already has data
          // Push it to the cache
          chunkCache.push(chunk);
          if (chunkCache.dataLength >= highWaterMark) {
            // flush in order to join the typed arrays
            onProgress(stats, context, chunkCache.flush(), response);
          }
        } else {
          // If there's nothing cached already, and the chache is large enough
          // just emit the progress event
          onProgress(stats, context, chunk, response);
        }
        return pump();
      }).catch(() => {
        /* aborted */
        return Promise.reject();
      });
    };
    return pump();
  }
}
function getRequestParameters(context, signal) {
  const initParams = {
    method: 'GET',
    mode: 'cors',
    credentials: 'same-origin',
    signal,
    headers: new self.Headers(_extends({}, context.headers))
  };
  if (context.rangeEnd) {
    initParams.headers.set('Range', 'bytes=' + context.rangeStart + '-' + String(context.rangeEnd - 1));
  }
  return initParams;
}
function getByteRangeLength(byteRangeHeader) {
  const result = BYTERANGE.exec(byteRangeHeader);
  if (result) {
    return parseInt(result[2]) - parseInt(result[1]) + 1;
  }
}
function getContentLength(headers) {
  const contentRange = headers.get('Content-Range');
  if (contentRange) {
    const byteRangeLength = getByteRangeLength(contentRange);
    if (isFiniteNumber(byteRangeLength)) {
      return byteRangeLength;
    }
  }
  const contentLength = headers.get('Content-Length');
  if (contentLength) {
    return parseInt(contentLength);
  }
}
function getRequest(context, initParams) {
  return new self.Request(context.url, initParams);
}
class FetchError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = void 0;
    this.details = void 0;
    this.code = code;
    this.details = details;
  }
}

const WHITESPACE_CHAR = /\s/;
const Cues = {
  newCue(track, startTime, endTime, captionScreen) {
    const result = [];
    let row;
    // the type data states this is VTTCue, but it can potentially be a TextTrackCue on old browsers
    let cue;
    let indenting;
    let indent;
    let text;
    const Cue = self.VTTCue || self.TextTrackCue;
    for (let r = 0; r < captionScreen.rows.length; r++) {
      row = captionScreen.rows[r];
      indenting = true;
      indent = 0;
      text = '';
      if (!row.isEmpty()) {
        var _track$cues;
        for (let c = 0; c < row.chars.length; c++) {
          if (WHITESPACE_CHAR.test(row.chars[c].uchar) && indenting) {
            indent++;
          } else {
            text += row.chars[c].uchar;
            indenting = false;
          }
        }
        // To be used for cleaning-up orphaned roll-up captions
        row.cueStartTime = startTime;

        // Give a slight bump to the endTime if it's equal to startTime to avoid a SyntaxError in IE
        if (startTime === endTime) {
          endTime += 0.0001;
        }
        if (indent >= 16) {
          indent--;
        } else {
          indent++;
        }
        const cueText = fixLineBreaks(text.trim());
        const id = generateCueId(startTime, endTime, cueText);

        // If this cue already exists in the track do not push it
        if (!(track != null && (_track$cues = track.cues) != null && _track$cues.getCueById(id))) {
          cue = new Cue(startTime, endTime, cueText);
          cue.id = id;
          cue.line = r + 1;
          cue.align = 'left';
          // Clamp the position between 10 and 80 percent (CEA-608 PAC indent code)
          // https://dvcs.w3.org/hg/text-tracks/raw-file/default/608toVTT/608toVTT.html#positioning-in-cea-608
          // Firefox throws an exception and captions break with out of bounds 0-100 values
          cue.position = 10 + Math.min(80, Math.floor(indent * 8 / 32) * 10);
          result.push(cue);
        }
      }
    }
    if (track && result.length) {
      // Sort bottom cues in reverse order so that they render in line order when overlapping in Chrome
      result.sort((cueA, cueB) => {
        if (cueA.line === 'auto' || cueB.line === 'auto') {
          return 0;
        }
        if (cueA.line > 8 && cueB.line > 8) {
          return cueB.line - cueA.line;
        }
        return cueA.line - cueB.line;
      });
      result.forEach(cue => addCueToTrack(track, cue));
    }
    return result;
  }
};

/**
 * @deprecated use fragLoadPolicy.default
 */

/**
 * @deprecated use manifestLoadPolicy.default and playlistLoadPolicy.default
 */

const defaultLoadPolicy = {
  maxTimeToFirstByteMs: 8000,
  maxLoadTimeMs: 20000,
  timeoutRetry: null,
  errorRetry: null
};

/**
 * @ignore
 * If possible, keep hlsDefaultConfig shallow
 * It is cloned whenever a new Hls instance is created, by keeping the config
 * shallow the properties are cloned, and we don't end up manipulating the default
 */
const hlsDefaultConfig = _objectSpread2(_objectSpread2({
  autoStartLoad: true,
  // used by stream-controller
  startPosition: -1,
  // used by stream-controller
  defaultAudioCodec: undefined,
  // used by stream-controller
  debug: false,
  // used by logger
  capLevelOnFPSDrop: false,
  // used by fps-controller
  capLevelToPlayerSize: false,
  // used by cap-level-controller
  ignoreDevicePixelRatio: false,
  // used by cap-level-controller
  initialLiveManifestSize: 1,
  // used by stream-controller
  maxBufferLength: 30,
  // used by stream-controller
  backBufferLength: Infinity,
  // used by buffer-controller
  maxBufferSize: 60 * 1000 * 1000,
  // used by stream-controller
  maxBufferHole: 0.1,
  // used by stream-controller
  highBufferWatchdogPeriod: 2,
  // used by stream-controller
  nudgeOffset: 0.1,
  // used by stream-controller
  nudgeMaxRetry: 3,
  // used by stream-controller
  maxFragLookUpTolerance: 0.25,
  // used by stream-controller
  liveSyncDurationCount: 3,
  // used by latency-controller
  liveMaxLatencyDurationCount: Infinity,
  // used by latency-controller
  liveSyncDuration: undefined,
  // used by latency-controller
  liveMaxLatencyDuration: undefined,
  // used by latency-controller
  maxLiveSyncPlaybackRate: 1,
  // used by latency-controller
  liveDurationInfinity: false,
  // used by buffer-controller
  /**
   * @deprecated use backBufferLength
   */
  liveBackBufferLength: null,
  // used by buffer-controller
  maxMaxBufferLength: 600,
  // used by stream-controller
  enableWorker: true,
  // used by transmuxer
  workerPath: null,
  // used by transmuxer
  enableSoftwareAES: true,
  // used by decrypter
  startLevel: undefined,
  // used by level-controller
  startFragPrefetch: false,
  // used by stream-controller
  fpsDroppedMonitoringPeriod: 5000,
  // used by fps-controller
  fpsDroppedMonitoringThreshold: 0.2,
  // used by fps-controller
  appendErrorMaxRetry: 3,
  // used by buffer-controller
  loader: XhrLoader,
  // loader: FetchLoader,
  fLoader: undefined,
  // used by fragment-loader
  pLoader: undefined,
  // used by playlist-loader
  xhrSetup: undefined,
  // used by xhr-loader
  licenseXhrSetup: undefined,
  // used by eme-controller
  licenseResponseCallback: undefined,
  // used by eme-controller
  abrController: AbrController,
  bufferController: BufferController,
  capLevelController: CapLevelController,
  errorController: ErrorController,
  fpsController: FPSController,
  stretchShortVideoTrack: false,
  // used by mp4-remuxer
  maxAudioFramesDrift: 1,
  // used by mp4-remuxer
  forceKeyFrameOnDiscontinuity: true,
  // used by ts-demuxer
  abrEwmaFastLive: 3,
  // used by abr-controller
  abrEwmaSlowLive: 9,
  // used by abr-controller
  abrEwmaFastVoD: 3,
  // used by abr-controller
  abrEwmaSlowVoD: 9,
  // used by abr-controller
  abrEwmaDefaultEstimate: 5e5,
  // 500 kbps  // used by abr-controller
  abrBandWidthFactor: 0.95,
  // used by abr-controller
  abrBandWidthUpFactor: 0.7,
  // used by abr-controller
  abrMaxWithRealBitrate: false,
  // used by abr-controller
  maxStarvationDelay: 4,
  // used by abr-controller
  maxLoadingDelay: 4,
  // used by abr-controller
  minAutoBitrate: 0,
  // used by hls
  emeEnabled: false,
  // used by eme-controller
  widevineLicenseUrl: undefined,
  // used by eme-controller
  drmSystems: {},
  // used by eme-controller
  drmSystemOptions: {},
  // used by eme-controller
  requestMediaKeySystemAccessFunc: requestMediaKeySystemAccess ,
  // used by eme-controller
  testBandwidth: true,
  progressive: false,
  lowLatencyMode: true,
  cmcd: undefined,
  enableDateRangeMetadataCues: true,
  enableEmsgMetadataCues: true,
  enableID3MetadataCues: true,
  certLoadPolicy: {
    default: defaultLoadPolicy
  },
  keyLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 8000,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 1,
        retryDelayMs: 1000,
        maxRetryDelayMs: 20000,
        backoff: 'linear'
      },
      errorRetry: {
        maxNumRetry: 8,
        retryDelayMs: 1000,
        maxRetryDelayMs: 20000,
        backoff: 'linear'
      }
    }
  },
  manifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: Infinity,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 2,
        retryDelayMs: 0,
        maxRetryDelayMs: 0
      },
      errorRetry: {
        maxNumRetry: 1,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000
      }
    }
  },
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 2,
        retryDelayMs: 0,
        maxRetryDelayMs: 0
      },
      errorRetry: {
        maxNumRetry: 2,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000
      }
    }
  },
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 120000,
      timeoutRetry: {
        maxNumRetry: 4,
        retryDelayMs: 0,
        maxRetryDelayMs: 0
      },
      errorRetry: {
        maxNumRetry: 6,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000
      }
    }
  },
  steeringManifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 20000,
      timeoutRetry: {
        maxNumRetry: 2,
        retryDelayMs: 0,
        maxRetryDelayMs: 0
      },
      errorRetry: {
        maxNumRetry: 1,
        retryDelayMs: 1000,
        maxRetryDelayMs: 8000
      }
    }
  },
  // These default settings are deprecated in favor of the above policies
  // and are maintained for backwards compatibility
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 1,
  manifestLoadingRetryDelay: 1000,
  manifestLoadingMaxRetryTimeout: 64000,
  levelLoadingTimeOut: 10000,
  levelLoadingMaxRetry: 4,
  levelLoadingRetryDelay: 1000,
  levelLoadingMaxRetryTimeout: 64000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1000,
  fragLoadingMaxRetryTimeout: 64000
}, timelineConfig()), {}, {
  subtitleStreamController: SubtitleStreamController ,
  subtitleTrackController: SubtitleTrackController ,
  timelineController: TimelineController ,
  audioStreamController: AudioStreamController ,
  audioTrackController: AudioTrackController ,
  emeController: EMEController ,
  cmcdController: CMCDController ,
  contentSteeringController: ContentSteeringController
});
function timelineConfig() {
  return {
    cueHandler: Cues,
    // used by timeline-controller
    enableWebVTT: true,
    // used by timeline-controller
    enableIMSC1: true,
    // used by timeline-controller
    enableCEA708Captions: true,
    // used by timeline-controller
    captionsTextTrack1Label: 'English',
    // used by timeline-controller
    captionsTextTrack1LanguageCode: 'en',
    // used by timeline-controller
    captionsTextTrack2Label: 'Spanish',
    // used by timeline-controller
    captionsTextTrack2LanguageCode: 'es',
    // used by timeline-controller
    captionsTextTrack3Label: 'Unknown CC',
    // used by timeline-controller
    captionsTextTrack3LanguageCode: '',
    // used by timeline-controller
    captionsTextTrack4Label: 'Unknown CC',
    // used by timeline-controller
    captionsTextTrack4LanguageCode: '',
    // used by timeline-controller
    renderTextTracksNatively: true
  };
}

/**
 * @ignore
 */
function mergeConfig(defaultConfig, userConfig) {
  if ((userConfig.liveSyncDurationCount || userConfig.liveMaxLatencyDurationCount) && (userConfig.liveSyncDuration || userConfig.liveMaxLatencyDuration)) {
    throw new Error("Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration");
  }
  if (userConfig.liveMaxLatencyDurationCount !== undefined && (userConfig.liveSyncDurationCount === undefined || userConfig.liveMaxLatencyDurationCount <= userConfig.liveSyncDurationCount)) {
    throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"');
  }
  if (userConfig.liveMaxLatencyDuration !== undefined && (userConfig.liveSyncDuration === undefined || userConfig.liveMaxLatencyDuration <= userConfig.liveSyncDuration)) {
    throw new Error('Illegal hls.js config: "liveMaxLatencyDuration" must be greater than "liveSyncDuration"');
  }
  const defaultsCopy = deepCpy(defaultConfig);

  // Backwards compatibility with deprecated config values
  const deprecatedSettingTypes = ['manifest', 'level', 'frag'];
  const deprecatedSettings = ['TimeOut', 'MaxRetry', 'RetryDelay', 'MaxRetryTimeout'];
  deprecatedSettingTypes.forEach(type => {
    const policyName = `${type === 'level' ? 'playlist' : type}LoadPolicy`;
    const policyNotSet = userConfig[policyName] === undefined;
    const report = [];
    deprecatedSettings.forEach(setting => {
      const deprecatedSetting = `${type}Loading${setting}`;
      const value = userConfig[deprecatedSetting];
      if (value !== undefined && policyNotSet) {
        report.push(deprecatedSetting);
        const settings = defaultsCopy[policyName].default;
        userConfig[policyName] = {
          default: settings
        };
        switch (setting) {
          case 'TimeOut':
            settings.maxLoadTimeMs = value;
            settings.maxTimeToFirstByteMs = value;
            break;
          case 'MaxRetry':
            settings.errorRetry.maxNumRetry = value;
            settings.timeoutRetry.maxNumRetry = value;
            break;
          case 'RetryDelay':
            settings.errorRetry.retryDelayMs = value;
            settings.timeoutRetry.retryDelayMs = value;
            break;
          case 'MaxRetryTimeout':
            settings.errorRetry.maxRetryDelayMs = value;
            settings.timeoutRetry.maxRetryDelayMs = value;
            break;
        }
      }
    });
    if (report.length) {
      logger.warn(`hls.js config: "${report.join('", "')}" setting(s) are deprecated, use "${policyName}": ${JSON.stringify(userConfig[policyName])}`);
    }
  });
  return _objectSpread2(_objectSpread2({}, defaultsCopy), userConfig);
}
function deepCpy(obj) {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(deepCpy);
    }
    return Object.keys(obj).reduce((result, key) => {
      result[key] = deepCpy(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * @ignore
 */
function enableStreamingMode(config) {
  const currentLoader = config.loader;
  if (currentLoader !== FetchLoader && currentLoader !== XhrLoader) {
    // If a developer has configured their own loader, respect that choice
    logger.log('[config]: Custom loader detected, cannot enable progressive streaming');
    config.progressive = false;
  } else {
    const canStreamProgressively = fetchSupported();
    if (canStreamProgressively) {
      config.loader = FetchLoader;
      config.progressive = true;
      config.enableSoftwareAES = true;
      logger.log('[config]: Progressive streaming enabled, using FetchLoader');
    }
  }
}

/**
 * The `Hls` class is the core of the HLS.js library used to instantiate player instances.
 * @public
 */
class Hls {
  /**
   * The runtime configuration used by the player. At instantiation this is combination of `hls.userConfig` merged over `Hls.DefaultConfig`.
   */

  /**
   * The configuration object provided on player instantiation.
   */

  /**
   * Get the video-dev/hls.js package version.
   */
  static get version() {
    return "1.4.13";
  }

  /**
   * Check if the required MediaSource Extensions are available.
   */
  static isSupported() {
    return isSupported();
  }
  static get Events() {
    return Events;
  }
  static get ErrorTypes() {
    return ErrorTypes;
  }
  static get ErrorDetails() {
    return ErrorDetails;
  }

  /**
   * Get the default configuration applied to new instances.
   */
  static get DefaultConfig() {
    if (!Hls.defaultConfig) {
      return hlsDefaultConfig;
    }
    return Hls.defaultConfig;
  }

  /**
   * Replace the default configuration applied to new instances.
   */
  static set DefaultConfig(defaultConfig) {
    Hls.defaultConfig = defaultConfig;
  }

  /**
   * Creates an instance of an HLS client that can attach to exactly one `HTMLMediaElement`.
   * @param userConfig - Configuration options applied over `Hls.DefaultConfig`
   */
  constructor(userConfig = {}) {
    this.config = void 0;
    this.userConfig = void 0;
    this.coreComponents = void 0;
    this.networkControllers = void 0;
    this._emitter = new EventEmitter();
    this._autoLevelCapping = void 0;
    this._maxHdcpLevel = null;
    this.abrController = void 0;
    this.bufferController = void 0;
    this.capLevelController = void 0;
    this.latencyController = void 0;
    this.levelController = void 0;
    this.streamController = void 0;
    this.audioTrackController = void 0;
    this.subtitleTrackController = void 0;
    this.emeController = void 0;
    this.cmcdController = void 0;
    this._media = null;
    this.url = null;
    enableLogs(userConfig.debug || false, 'Hls instance');
    const config = this.config = mergeConfig(Hls.DefaultConfig, userConfig);
    this.userConfig = userConfig;
    this._autoLevelCapping = -1;
    if (config.progressive) {
      enableStreamingMode(config);
    }

    // core controllers and network loaders
    const {
      abrController: ConfigAbrController,
      bufferController: ConfigBufferController,
      capLevelController: ConfigCapLevelController,
      errorController: ConfigErrorController,
      fpsController: ConfigFpsController
    } = config;
    const errorController = new ConfigErrorController(this);
    const abrController = this.abrController = new ConfigAbrController(this);
    const bufferController = this.bufferController = new ConfigBufferController(this);
    const capLevelController = this.capLevelController = new ConfigCapLevelController(this);
    const fpsController = new ConfigFpsController(this);
    const playListLoader = new PlaylistLoader(this);
    const id3TrackController = new ID3TrackController(this);
    const ConfigContentSteeringController = config.contentSteeringController;
    // ConentSteeringController is defined before LevelController to receive Multivariant Playlist events first
    const contentSteering = ConfigContentSteeringController ? new ConfigContentSteeringController(this) : null;
    const levelController = this.levelController = new LevelController(this, contentSteering);
    // FragmentTracker must be defined before StreamController because the order of event handling is important
    const fragmentTracker = new FragmentTracker(this);
    const keyLoader = new KeyLoader(this.config);
    const streamController = this.streamController = new StreamController(this, fragmentTracker, keyLoader);

    // Cap level controller uses streamController to flush the buffer
    capLevelController.setStreamController(streamController);
    // fpsController uses streamController to switch when frames are being dropped
    fpsController.setStreamController(streamController);
    const networkControllers = [playListLoader, levelController, streamController];
    if (contentSteering) {
      networkControllers.splice(1, 0, contentSteering);
    }
    this.networkControllers = networkControllers;
    const coreComponents = [abrController, bufferController, capLevelController, fpsController, id3TrackController, fragmentTracker];
    this.audioTrackController = this.createController(config.audioTrackController, networkControllers);
    const AudioStreamControllerClass = config.audioStreamController;
    if (AudioStreamControllerClass) {
      networkControllers.push(new AudioStreamControllerClass(this, fragmentTracker, keyLoader));
    }
    // subtitleTrackController must be defined before subtitleStreamController because the order of event handling is important
    this.subtitleTrackController = this.createController(config.subtitleTrackController, networkControllers);
    const SubtitleStreamControllerClass = config.subtitleStreamController;
    if (SubtitleStreamControllerClass) {
      networkControllers.push(new SubtitleStreamControllerClass(this, fragmentTracker, keyLoader));
    }
    this.createController(config.timelineController, coreComponents);
    keyLoader.emeController = this.emeController = this.createController(config.emeController, coreComponents);
    this.cmcdController = this.createController(config.cmcdController, coreComponents);
    this.latencyController = this.createController(LatencyController, coreComponents);
    this.coreComponents = coreComponents;

    // Error controller handles errors before and after all other controllers
    // This listener will be invoked after all other controllers error listeners
    networkControllers.push(errorController);
    const onErrorOut = errorController.onErrorOut;
    if (typeof onErrorOut === 'function') {
      this.on(Events.ERROR, onErrorOut, errorController);
    }
  }
  createController(ControllerClass, components) {
    if (ControllerClass) {
      const controllerInstance = new ControllerClass(this);
      if (components) {
        components.push(controllerInstance);
      }
      return controllerInstance;
    }
    return null;
  }

  // Delegate the EventEmitter through the public API of Hls.js
  on(event, listener, context = this) {
    this._emitter.on(event, listener, context);
  }
  once(event, listener, context = this) {
    this._emitter.once(event, listener, context);
  }
  removeAllListeners(event) {
    this._emitter.removeAllListeners(event);
  }
  off(event, listener, context = this, once) {
    this._emitter.off(event, listener, context, once);
  }
  listeners(event) {
    return this._emitter.listeners(event);
  }
  emit(event, name, eventObject) {
    return this._emitter.emit(event, name, eventObject);
  }
  trigger(event, eventObject) {
    if (this.config.debug) {
      return this.emit(event, event, eventObject);
    } else {
      try {
        return this.emit(event, event, eventObject);
      } catch (e) {
        logger.error('An internal error happened while handling event ' + event + '. Error message: "' + e.message + '". Here is a stacktrace:', e);
        this.trigger(Events.ERROR, {
          type: ErrorTypes.OTHER_ERROR,
          details: ErrorDetails.INTERNAL_EXCEPTION,
          fatal: false,
          event: event,
          error: e
        });
      }
    }
    return false;
  }
  listenerCount(event) {
    return this._emitter.listenerCount(event);
  }

  /**
   * Dispose of the instance
   */
  destroy() {
    logger.log('destroy');
    this.trigger(Events.DESTROYING, undefined);
    this.detachMedia();
    this.removeAllListeners();
    this._autoLevelCapping = -1;
    this.url = null;
    this.networkControllers.forEach(component => component.destroy());
    this.networkControllers.length = 0;
    this.coreComponents.forEach(component => component.destroy());
    this.coreComponents.length = 0;
    // Remove any references that could be held in config options or callbacks
    const config = this.config;
    config.xhrSetup = config.fetchSetup = undefined;
    // @ts-ignore
    this.userConfig = null;
  }

  /**
   * Attaches Hls.js to a media element
   */
  attachMedia(media) {
    logger.log('attachMedia');
    this._media = media;
    this.trigger(Events.MEDIA_ATTACHING, {
      media: media
    });
  }

  /**
   * Detach Hls.js from the media
   */
  detachMedia() {
    logger.log('detachMedia');
    this.trigger(Events.MEDIA_DETACHING, undefined);
    this._media = null;
  }

  /**
   * Set the source URL. Can be relative or absolute.
   */
  loadSource(url) {
    this.stopLoad();
    const media = this.media;
    const loadedSource = this.url;
    const loadingSource = this.url = urlToolkitExports.buildAbsoluteURL(self.location.href, url, {
      alwaysNormalize: true
    });
    logger.log(`loadSource:${loadingSource}`);
    if (media && loadedSource && (loadedSource !== loadingSource || this.bufferController.hasSourceTypes())) {
      this.detachMedia();
      this.attachMedia(media);
    }
    // when attaching to a source URL, trigger a playlist load
    this.trigger(Events.MANIFEST_LOADING, {
      url: url
    });
  }

  /**
   * Start loading data from the stream source.
   * Depending on default config, client starts loading automatically when a source is set.
   *
   * @param startPosition - Set the start position to stream from.
   * Defaults to -1 (None: starts from earliest point)
   */
  startLoad(startPosition = -1) {
    logger.log(`startLoad(${startPosition})`);
    this.networkControllers.forEach(controller => {
      controller.startLoad(startPosition);
    });
  }

  /**
   * Stop loading of any stream data.
   */
  stopLoad() {
    logger.log('stopLoad');
    this.networkControllers.forEach(controller => {
      controller.stopLoad();
    });
  }

  /**
   * Swap through possible audio codecs in the stream (for example to switch from stereo to 5.1)
   */
  swapAudioCodec() {
    logger.log('swapAudioCodec');
    this.streamController.swapAudioCodec();
  }

  /**
   * When the media-element fails, this allows to detach and then re-attach it
   * as one call (convenience method).
   *
   * Automatic recovery of media-errors by this process is configurable.
   */
  recoverMediaError() {
    logger.log('recoverMediaError');
    const media = this._media;
    this.detachMedia();
    if (media) {
      this.attachMedia(media);
    }
  }
  removeLevel(levelIndex, urlId = 0) {
    this.levelController.removeLevel(levelIndex, urlId);
  }

  /**
   * @returns an array of levels (variants) sorted by HDCP-LEVEL, BANDWIDTH, SCORE, and RESOLUTION (height)
   */
  get levels() {
    const levels = this.levelController.levels;
    return levels ? levels : [];
  }

  /**
   * Index of quality level (variant) currently played
   */
  get currentLevel() {
    return this.streamController.currentLevel;
  }

  /**
   * Set quality level index immediately. This will flush the current buffer to replace the quality asap. That means playback will interrupt at least shortly to re-buffer and re-sync eventually. Set to -1 for automatic level selection.
   */
  set currentLevel(newLevel) {
    logger.log(`set currentLevel:${newLevel}`);
    this.loadLevel = newLevel;
    this.abrController.clearTimer();
    this.streamController.immediateLevelSwitch();
  }

  /**
   * Index of next quality level loaded as scheduled by stream controller.
   */
  get nextLevel() {
    return this.streamController.nextLevel;
  }

  /**
   * Set quality level index for next loaded data.
   * This will switch the video quality asap, without interrupting playback.
   * May abort current loading of data, and flush parts of buffer (outside currently played fragment region).
   * @param newLevel - Pass -1 for automatic level selection
   */
  set nextLevel(newLevel) {
    logger.log(`set nextLevel:${newLevel}`);
    this.levelController.manualLevel = newLevel;
    this.streamController.nextLevelSwitch();
  }

  /**
   * Return the quality level of the currently or last (of none is loaded currently) segment
   */
  get loadLevel() {
    return this.levelController.level;
  }

  /**
   * Set quality level index for next loaded data in a conservative way.
   * This will switch the quality without flushing, but interrupt current loading.
   * Thus the moment when the quality switch will appear in effect will only be after the already existing buffer.
   * @param newLevel - Pass -1 for automatic level selection
   */
  set loadLevel(newLevel) {
    logger.log(`set loadLevel:${newLevel}`);
    this.levelController.manualLevel = newLevel;
  }

  /**
   * get next quality level loaded
   */
  get nextLoadLevel() {
    return this.levelController.nextLoadLevel;
  }

  /**
   * Set quality level of next loaded segment in a fully "non-destructive" way.
   * Same as `loadLevel` but will wait for next switch (until current loading is done).
   */
  set nextLoadLevel(level) {
    this.levelController.nextLoadLevel = level;
  }

  /**
   * Return "first level": like a default level, if not set,
   * falls back to index of first level referenced in manifest
   */
  get firstLevel() {
    return Math.max(this.levelController.firstLevel, this.minAutoLevel);
  }

  /**
   * Sets "first-level", see getter.
   */
  set firstLevel(newLevel) {
    logger.log(`set firstLevel:${newLevel}`);
    this.levelController.firstLevel = newLevel;
  }

  /**
   * Return start level (level of first fragment that will be played back)
   * if not overrided by user, first level appearing in manifest will be used as start level
   * if -1 : automatic start level selection, playback will start from level matching download bandwidth
   * (determined from download of first segment)
   */
  get startLevel() {
    return this.levelController.startLevel;
  }

  /**
   * set  start level (level of first fragment that will be played back)
   * if not overrided by user, first level appearing in manifest will be used as start level
   * if -1 : automatic start level selection, playback will start from level matching download bandwidth
   * (determined from download of first segment)
   */
  set startLevel(newLevel) {
    logger.log(`set startLevel:${newLevel}`);
    // if not in automatic start level detection, ensure startLevel is greater than minAutoLevel
    if (newLevel !== -1) {
      newLevel = Math.max(newLevel, this.minAutoLevel);
    }
    this.levelController.startLevel = newLevel;
  }

  /**
   * Whether level capping is enabled.
   * Default value is set via `config.capLevelToPlayerSize`.
   */
  get capLevelToPlayerSize() {
    return this.config.capLevelToPlayerSize;
  }

  /**
   * Enables or disables level capping. If disabled after previously enabled, `nextLevelSwitch` will be immediately called.
   */
  set capLevelToPlayerSize(shouldStartCapping) {
    const newCapLevelToPlayerSize = !!shouldStartCapping;
    if (newCapLevelToPlayerSize !== this.config.capLevelToPlayerSize) {
      if (newCapLevelToPlayerSize) {
        this.capLevelController.startCapping(); // If capping occurs, nextLevelSwitch will happen based on size.
      } else {
        this.capLevelController.stopCapping();
        this.autoLevelCapping = -1;
        this.streamController.nextLevelSwitch(); // Now we're uncapped, get the next level asap.
      }

      this.config.capLevelToPlayerSize = newCapLevelToPlayerSize;
    }
  }

  /**
   * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
   */
  get autoLevelCapping() {
    return this._autoLevelCapping;
  }

  /**
   * Returns the current bandwidth estimate in bits per second, when available. Otherwise, `NaN` is returned.
   */
  get bandwidthEstimate() {
    const {
      bwEstimator
    } = this.abrController;
    if (!bwEstimator) {
      return NaN;
    }
    return bwEstimator.getEstimate();
  }

  /**
   * get time to first byte estimate
   * @type {number}
   */
  get ttfbEstimate() {
    const {
      bwEstimator
    } = this.abrController;
    if (!bwEstimator) {
      return NaN;
    }
    return bwEstimator.getEstimateTTFB();
  }

  /**
   * Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
   */
  set autoLevelCapping(newLevel) {
    if (this._autoLevelCapping !== newLevel) {
      logger.log(`set autoLevelCapping:${newLevel}`);
      this._autoLevelCapping = newLevel;
    }
  }
  get maxHdcpLevel() {
    return this._maxHdcpLevel;
  }
  set maxHdcpLevel(value) {
    if (HdcpLevels.indexOf(value) > -1) {
      this._maxHdcpLevel = value;
    }
  }

  /**
   * True when automatic level selection enabled
   */
  get autoLevelEnabled() {
    return this.levelController.manualLevel === -1;
  }

  /**
   * Level set manually (if any)
   */
  get manualLevel() {
    return this.levelController.manualLevel;
  }

  /**
   * min level selectable in auto mode according to config.minAutoBitrate
   */
  get minAutoLevel() {
    const {
      levels,
      config: {
        minAutoBitrate
      }
    } = this;
    if (!levels) return 0;
    const len = levels.length;
    for (let i = 0; i < len; i++) {
      if (levels[i].maxBitrate >= minAutoBitrate) {
        return i;
      }
    }
    return 0;
  }

  /**
   * max level selectable in auto mode according to autoLevelCapping
   */
  get maxAutoLevel() {
    const {
      levels,
      autoLevelCapping,
      maxHdcpLevel
    } = this;
    let maxAutoLevel;
    if (autoLevelCapping === -1 && levels && levels.length) {
      maxAutoLevel = levels.length - 1;
    } else {
      maxAutoLevel = autoLevelCapping;
    }
    if (maxHdcpLevel) {
      for (let i = maxAutoLevel; i--;) {
        const hdcpLevel = levels[i].attrs['HDCP-LEVEL'];
        if (hdcpLevel && hdcpLevel <= maxHdcpLevel) {
          return i;
        }
      }
    }
    return maxAutoLevel;
  }

  /**
   * next automatically selected quality level
   */
  get nextAutoLevel() {
    // ensure next auto level is between  min and max auto level
    return Math.min(Math.max(this.abrController.nextAutoLevel, this.minAutoLevel), this.maxAutoLevel);
  }

  /**
   * this setter is used to force next auto level.
   * this is useful to force a switch down in auto mode:
   * in case of load error on level N, hls.js can set nextAutoLevel to N-1 for example)
   * forced value is valid for one fragment. upon successful frag loading at forced level,
   * this value will be resetted to -1 by ABR controller.
   */
  set nextAutoLevel(nextLevel) {
    this.abrController.nextAutoLevel = Math.max(this.minAutoLevel, nextLevel);
  }

  /**
   * get the datetime value relative to media.currentTime for the active level Program Date Time if present
   */
  get playingDate() {
    return this.streamController.currentProgramDateTime;
  }
  get mainForwardBufferInfo() {
    return this.streamController.getMainFwdBufferInfo();
  }

  /**
   * Get the list of selectable audio tracks
   */
  get audioTracks() {
    const audioTrackController = this.audioTrackController;
    return audioTrackController ? audioTrackController.audioTracks : [];
  }

  /**
   * index of the selected audio track (index in audio track lists)
   */
  get audioTrack() {
    const audioTrackController = this.audioTrackController;
    return audioTrackController ? audioTrackController.audioTrack : -1;
  }

  /**
   * selects an audio track, based on its index in audio track lists
   */
  set audioTrack(audioTrackId) {
    const audioTrackController = this.audioTrackController;
    if (audioTrackController) {
      audioTrackController.audioTrack = audioTrackId;
    }
  }

  /**
   * get alternate subtitle tracks list from playlist
   */
  get subtitleTracks() {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController ? subtitleTrackController.subtitleTracks : [];
  }

  /**
   * index of the selected subtitle track (index in subtitle track lists)
   */
  get subtitleTrack() {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController ? subtitleTrackController.subtitleTrack : -1;
  }
  get media() {
    return this._media;
  }

  /**
   * select an subtitle track, based on its index in subtitle track lists
   */
  set subtitleTrack(subtitleTrackId) {
    const subtitleTrackController = this.subtitleTrackController;
    if (subtitleTrackController) {
      subtitleTrackController.subtitleTrack = subtitleTrackId;
    }
  }

  /**
   * Whether subtitle display is enabled or not
   */
  get subtitleDisplay() {
    const subtitleTrackController = this.subtitleTrackController;
    return subtitleTrackController ? subtitleTrackController.subtitleDisplay : false;
  }

  /**
   * Enable/disable subtitle display rendering
   */
  set subtitleDisplay(value) {
    const subtitleTrackController = this.subtitleTrackController;
    if (subtitleTrackController) {
      subtitleTrackController.subtitleDisplay = value;
    }
  }

  /**
   * get mode for Low-Latency HLS loading
   */
  get lowLatencyMode() {
    return this.config.lowLatencyMode;
  }

  /**
   * Enable/disable Low-Latency HLS part playlist and segment loading, and start live streams at playlist PART-HOLD-BACK rather than HOLD-BACK.
   */
  set lowLatencyMode(mode) {
    this.config.lowLatencyMode = mode;
  }

  /**
   * Position (in seconds) of live sync point (ie edge of live position minus safety delay defined by ```hls.config.liveSyncDuration```)
   * @returns null prior to loading live Playlist
   */
  get liveSyncPosition() {
    return this.latencyController.liveSyncPosition;
  }

  /**
   * Estimated position (in seconds) of live edge (ie edge of live playlist plus time sync playlist advanced)
   * @returns 0 before first playlist is loaded
   */
  get latency() {
    return this.latencyController.latency;
  }

  /**
   * maximum distance from the edge before the player seeks forward to ```hls.liveSyncPosition```
   * configured using ```liveMaxLatencyDurationCount``` (multiple of target duration) or ```liveMaxLatencyDuration```
   * @returns 0 before first playlist is loaded
   */
  get maxLatency() {
    return this.latencyController.maxLatency;
  }

  /**
   * target distance from the edge as calculated by the latency controller
   */
  get targetLatency() {
    return this.latencyController.targetLatency;
  }

  /**
   * the rate at which the edge of the current live playlist is advancing or 1 if there is none
   */
  get drift() {
    return this.latencyController.drift;
  }

  /**
   * set to true when startLoad is called before MANIFEST_PARSED event
   */
  get forceStartLoad() {
    return this.streamController.forceStartLoad;
  }
}
Hls.defaultConfig = void 0;

export { Hls as default };
//# sourceMappingURL=hls.js.map
