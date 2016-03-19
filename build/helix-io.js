/* pako 0.2.8 nodeca/pako */(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.pako = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    'use strict';


    var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
        (typeof Uint16Array !== 'undefined') &&
        (typeof Int32Array !== 'undefined');


    exports.assign = function (obj /*from1, from2, from3, ...*/) {
        var sources = Array.prototype.slice.call(arguments, 1);
        while (sources.length) {
            var source = sources.shift();
            if (!source) { continue; }

            if (typeof source !== 'object') {
                throw new TypeError(source + 'must be non-object');
            }

            for (var p in source) {
                if (source.hasOwnProperty(p)) {
                    obj[p] = source[p];
                }
            }
        }

        return obj;
    };


// reduce buffer size, avoiding mem copy
    exports.shrinkBuf = function (buf, size) {
        if (buf.length === size) { return buf; }
        if (buf.subarray) { return buf.subarray(0, size); }
        buf.length = size;
        return buf;
    };


    var fnTyped = {
        arraySet: function (dest, src, src_offs, len, dest_offs) {
            if (src.subarray && dest.subarray) {
                dest.set(src.subarray(src_offs, src_offs+len), dest_offs);
                return;
            }
            // Fallback to ordinary array
            for (var i=0; i<len; i++) {
                dest[dest_offs + i] = src[src_offs + i];
            }
        },
        // Join array of chunks to single array.
        flattenChunks: function(chunks) {
            var i, l, len, pos, chunk, result;

            // calculate data length
            len = 0;
            for (i=0, l=chunks.length; i<l; i++) {
                len += chunks[i].length;
            }

            // join chunks
            result = new Uint8Array(len);
            pos = 0;
            for (i=0, l=chunks.length; i<l; i++) {
                chunk = chunks[i];
                result.set(chunk, pos);
                pos += chunk.length;
            }

            return result;
        }
    };

    var fnUntyped = {
        arraySet: function (dest, src, src_offs, len, dest_offs) {
            for (var i=0; i<len; i++) {
                dest[dest_offs + i] = src[src_offs + i];
            }
        },
        // Join array of chunks to single array.
        flattenChunks: function(chunks) {
            return [].concat.apply([], chunks);
        }
    };


// Enable/Disable typed arrays use, for testing
//
    exports.setTyped = function (on) {
        if (on) {
            exports.Buf8  = Uint8Array;
            exports.Buf16 = Uint16Array;
            exports.Buf32 = Int32Array;
            exports.assign(exports, fnTyped);
        } else {
            exports.Buf8  = Array;
            exports.Buf16 = Array;
            exports.Buf32 = Array;
            exports.assign(exports, fnUntyped);
        }
    };

    exports.setTyped(TYPED_OK);

},{}],2:[function(require,module,exports){
// String encode/decode helpers
    'use strict';


    var utils = require('./common');


// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safary
//
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;

    try { String.fromCharCode.apply(null, [0]); } catch(__) { STR_APPLY_OK = false; }
    try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch(__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
    var _utf8len = new utils.Buf8(256);
    for (var q=0; q<256; q++) {
        _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
    }
    _utf8len[254]=_utf8len[254]=1; // Invalid sequence start


// convert string to array (typed, when possible)
    exports.string2buf = function (str) {
        var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

        // count binary size
        for (m_pos = 0; m_pos < str_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
                c2 = str.charCodeAt(m_pos+1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
        }

        // allocate buffer
        buf = new utils.Buf8(buf_len);

        // convert
        for (i=0, m_pos = 0; i < buf_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
                c2 = str.charCodeAt(m_pos+1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            if (c < 0x80) {
                /* one byte */
                buf[i++] = c;
            } else if (c < 0x800) {
                /* two bytes */
                buf[i++] = 0xC0 | (c >>> 6);
                buf[i++] = 0x80 | (c & 0x3f);
            } else if (c < 0x10000) {
                /* three bytes */
                buf[i++] = 0xE0 | (c >>> 12);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            } else {
                /* four bytes */
                buf[i++] = 0xf0 | (c >>> 18);
                buf[i++] = 0x80 | (c >>> 12 & 0x3f);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            }
        }

        return buf;
    };

// Helper (used in 2 places)
    function buf2binstring(buf, len) {
        // use fallback for big arrays to avoid stack overflow
        if (len < 65537) {
            if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
                return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
            }
        }

        var result = '';
        for (var i=0; i < len; i++) {
            result += String.fromCharCode(buf[i]);
        }
        return result;
    }


// Convert byte array to binary string
    exports.buf2binstring = function(buf) {
        return buf2binstring(buf, buf.length);
    };


// Convert binary string (typed, when possible)
    exports.binstring2buf = function(str) {
        var buf = new utils.Buf8(str.length);
        for (var i=0, len=buf.length; i < len; i++) {
            buf[i] = str.charCodeAt(i);
        }
        return buf;
    };


// convert array to string
    exports.buf2string = function (buf, max) {
        var i, out, c, c_len;
        var len = max || buf.length;

        // Reserve max possible length (2 words per char)
        // NB: by unknown reasons, Array is significantly faster for
        //     String.fromCharCode.apply than Uint16Array.
        var utf16buf = new Array(len*2);

        for (out=0, i=0; i<len;) {
            c = buf[i++];
            // quick process ascii
            if (c < 0x80) { utf16buf[out++] = c; continue; }

            c_len = _utf8len[c];
            // skip 5 & 6 byte codes
            if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

            // apply mask on first byte
            c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
            // join the rest
            while (c_len > 1 && i < len) {
                c = (c << 6) | (buf[i++] & 0x3f);
                c_len--;
            }

            // terminated by end of string?
            if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

            if (c < 0x10000) {
                utf16buf[out++] = c;
            } else {
                c -= 0x10000;
                utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
                utf16buf[out++] = 0xdc00 | (c & 0x3ff);
            }
        }

        return buf2binstring(utf16buf, out);
    };


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
    exports.utf8border = function(buf, max) {
        var pos;

        max = max || buf.length;
        if (max > buf.length) { max = buf.length; }

        // go back from last position, until start of sequence found
        pos = max-1;
        while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

        // Fuckup - very small and broken sequence,
        // return max, because we should return something anyway.
        if (pos < 0) { return max; }

        // If we came to start of buffer - that means vuffer is too small,
        // return max too.
        if (pos === 0) { return max; }

        return (pos + _utf8len[buf[pos]] > max) ? pos : max;
    };

},{"./common":1}],3:[function(require,module,exports){
    'use strict';

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It doesn't worth to make additional optimizationa as in original.
// Small size is preferable.

    function adler32(adler, buf, len, pos) {
        var s1 = (adler & 0xffff) |0,
            s2 = ((adler >>> 16) & 0xffff) |0,
            n = 0;

        while (len !== 0) {
            // Set limit ~ twice less than 5552, to keep
            // s2 in 31-bits, because we force signed ints.
            // in other case %= will fail.
            n = len > 2000 ? 2000 : len;
            len -= n;

            do {
                s1 = (s1 + buf[pos++]) |0;
                s2 = (s2 + s1) |0;
            } while (--n);

            s1 %= 65521;
            s2 %= 65521;
        }

        return (s1 | (s2 << 16)) |0;
    }


    module.exports = adler32;

},{}],4:[function(require,module,exports){
    module.exports = {

        /* Allowed flush values; see deflate() and inflate() below for details */
        Z_NO_FLUSH:         0,
        Z_PARTIAL_FLUSH:    1,
        Z_SYNC_FLUSH:       2,
        Z_FULL_FLUSH:       3,
        Z_FINISH:           4,
        Z_BLOCK:            5,
        Z_TREES:            6,

        /* Return codes for the compression/decompression functions. Negative values
         * are errors, positive values are used for special but normal events.
         */
        Z_OK:               0,
        Z_STREAM_END:       1,
        Z_NEED_DICT:        2,
        Z_ERRNO:           -1,
        Z_STREAM_ERROR:    -2,
        Z_DATA_ERROR:      -3,
        //Z_MEM_ERROR:     -4,
        Z_BUF_ERROR:       -5,
        //Z_VERSION_ERROR: -6,

        /* compression levels */
        Z_NO_COMPRESSION:         0,
        Z_BEST_SPEED:             1,
        Z_BEST_COMPRESSION:       9,
        Z_DEFAULT_COMPRESSION:   -1,


        Z_FILTERED:               1,
        Z_HUFFMAN_ONLY:           2,
        Z_RLE:                    3,
        Z_FIXED:                  4,
        Z_DEFAULT_STRATEGY:       0,

        /* Possible values of the data_type field (though see inflate()) */
        Z_BINARY:                 0,
        Z_TEXT:                   1,
        //Z_ASCII:                1, // = Z_TEXT (deprecated)
        Z_UNKNOWN:                2,

        /* The deflate compression method */
        Z_DEFLATED:               8
        //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };

},{}],5:[function(require,module,exports){
    'use strict';

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.


// Use ordinary array, since untyped makes no boost here
    function makeTable() {
        var c, table = [];

        for (var n =0; n < 256; n++) {
            c = n;
            for (var k =0; k < 8; k++) {
                c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c;
        }

        return table;
    }

// Create table on load. Just 255 signed longs. Not a problem.
    var crcTable = makeTable();


    function crc32(crc, buf, len, pos) {
        var t = crcTable,
            end = pos + len;

        crc = crc ^ (-1);

        for (var i = pos; i < end; i++) {
            crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
        }

        return (crc ^ (-1)); // >>> 0;
    }


    module.exports = crc32;

},{}],6:[function(require,module,exports){
    'use strict';


    function GZheader() {
        /* true if compressed data believed to be text */
        this.text       = 0;
        /* modification time */
        this.time       = 0;
        /* extra flags (not used when writing a gzip file) */
        this.xflags     = 0;
        /* operating system */
        this.os         = 0;
        /* pointer to extra field or Z_NULL if none */
        this.extra      = null;
        /* extra field length (valid if extra != Z_NULL) */
        this.extra_len  = 0; // Actually, we don't need it in JS,
                             // but leave for few code modifications

        //
        // Setup limits is not necessary because in js we should not preallocate memory
        // for inflate use constant limit in 65536 bytes
        //

        /* space at extra (only when reading header) */
        // this.extra_max  = 0;
        /* pointer to zero-terminated file name or Z_NULL */
        this.name       = '';
        /* space at name (only when reading header) */
        // this.name_max   = 0;
        /* pointer to zero-terminated comment or Z_NULL */
        this.comment    = '';
        /* space at comment (only when reading header) */
        // this.comm_max   = 0;
        /* true if there was or will be a header crc */
        this.hcrc       = 0;
        /* true when done reading gzip header (not used when writing a gzip file) */
        this.done       = false;
    }

    module.exports = GZheader;

},{}],7:[function(require,module,exports){
    'use strict';

// See state defs from inflate.js
    var BAD = 30;       /* got a data error -- remain here until reset */
    var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

    /*
     Decode literal, length, and distance codes and write out the resulting
     literal and match bytes until either not enough input or output is
     available, an end-of-block is encountered, or a data error is encountered.
     When large enough input and output buffers are supplied to inflate(), for
     example, a 16K input buffer and a 64K output buffer, more than 95% of the
     inflate execution time is spent in this routine.

     Entry assumptions:

     state.mode === LEN
     strm.avail_in >= 6
     strm.avail_out >= 258
     start >= strm.avail_out
     state.bits < 8

     On return, state.mode is one of:

     LEN -- ran out of enough output space or enough available input
     TYPE -- reached end of block code, inflate() to interpret next block
     BAD -- error in block data

     Notes:

     - The maximum input bits used by a length/distance pair is 15 bits for the
     length code, 5 bits for the length extra, 15 bits for the distance code,
     and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
     Therefore if strm.avail_in >= 6, then there is enough input to avoid
     checking for available input while decoding.

     - The maximum bytes that a single length/distance pair can output is 258
     bytes, which is the maximum length that can be coded.  inflate_fast()
     requires strm.avail_out >= 258 for each loop to avoid checking for
     output space.
     */
    module.exports = function inflate_fast(strm, start) {
        var state;
        var _in;                    /* local strm.input */
        var last;                   /* have enough input while in < last */
        var _out;                   /* local strm.output */
        var beg;                    /* inflate()'s initial strm.output */
        var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
        var dmax;                   /* maximum distance from zlib header */
//#endif
        var wsize;                  /* window size or zero if not using window */
        var whave;                  /* valid bytes in the window */
        var wnext;                  /* window write index */
        // Use `s_window` instead `window`, avoid conflict with instrumentation tools
        var s_window;               /* allocated sliding window, if wsize != 0 */
        var hold;                   /* local strm.hold */
        var bits;                   /* local strm.bits */
        var lcode;                  /* local strm.lencode */
        var dcode;                  /* local strm.distcode */
        var lmask;                  /* mask for first level of length codes */
        var dmask;                  /* mask for first level of distance codes */
        var here;                   /* retrieved table entry */
        var op;                     /* code bits, operation, extra bits, or */
        /*  window position, window bytes to copy */
        var len;                    /* match length, unused bytes */
        var dist;                   /* match distance */
        var from;                   /* where to copy match from */
        var from_source;


        var input, output; // JS specific, because we have no pointers

        /* copy state to local variables */
        state = strm.state;
        //here = state.here;
        _in = strm.next_in;
        input = strm.input;
        last = _in + (strm.avail_in - 5);
        _out = strm.next_out;
        output = strm.output;
        beg = _out - (start - strm.avail_out);
        end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
        dmax = state.dmax;
//#endif
        wsize = state.wsize;
        whave = state.whave;
        wnext = state.wnext;
        s_window = state.window;
        hold = state.hold;
        bits = state.bits;
        lcode = state.lencode;
        dcode = state.distcode;
        lmask = (1 << state.lenbits) - 1;
        dmask = (1 << state.distbits) - 1;


        /* decode literals and length/distances until end-of-block or not enough
         input data or output space */

        top:
            do {
                if (bits < 15) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    hold += input[_in++] << bits;
                    bits += 8;
                }

                here = lcode[hold & lmask];

                dolen:
                    for (;;) { // Goto emulation
                        op = here >>> 24/*here.bits*/;
                        hold >>>= op;
                        bits -= op;
                        op = (here >>> 16) & 0xff/*here.op*/;
                        if (op === 0) {                          /* literal */
                            //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
                            //        "inflate:         literal '%c'\n" :
                            //        "inflate:         literal 0x%02x\n", here.val));
                            output[_out++] = here & 0xffff/*here.val*/;
                        }
                        else if (op & 16) {                     /* length base */
                            len = here & 0xffff/*here.val*/;
                            op &= 15;                           /* number of extra bits */
                            if (op) {
                                if (bits < op) {
                                    hold += input[_in++] << bits;
                                    bits += 8;
                                }
                                len += hold & ((1 << op) - 1);
                                hold >>>= op;
                                bits -= op;
                            }
                            //Tracevv((stderr, "inflate:         length %u\n", len));
                            if (bits < 15) {
                                hold += input[_in++] << bits;
                                bits += 8;
                                hold += input[_in++] << bits;
                                bits += 8;
                            }
                            here = dcode[hold & dmask];

                            dodist:
                                for (;;) { // goto emulation
                                    op = here >>> 24/*here.bits*/;
                                    hold >>>= op;
                                    bits -= op;
                                    op = (here >>> 16) & 0xff/*here.op*/;

                                    if (op & 16) {                      /* distance base */
                                        dist = here & 0xffff/*here.val*/;
                                        op &= 15;                       /* number of extra bits */
                                        if (bits < op) {
                                            hold += input[_in++] << bits;
                                            bits += 8;
                                            if (bits < op) {
                                                hold += input[_in++] << bits;
                                                bits += 8;
                                            }
                                        }
                                        dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
                                        if (dist > dmax) {
                                            strm.msg = 'invalid distance too far back';
                                            state.mode = BAD;
                                            break top;
                                        }
//#endif
                                        hold >>>= op;
                                        bits -= op;
                                        //Tracevv((stderr, "inflate:         distance %u\n", dist));
                                        op = _out - beg;                /* max distance in output */
                                        if (dist > op) {                /* see if copy from window */
                                            op = dist - op;               /* distance back in window */
                                            if (op > whave) {
                                                if (state.sane) {
                                                    strm.msg = 'invalid distance too far back';
                                                    state.mode = BAD;
                                                    break top;
                                                }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
                                            }
                                            from = 0; // window index
                                            from_source = s_window;
                                            if (wnext === 0) {           /* very common case */
                                                from += wsize - op;
                                                if (op < len) {         /* some from window */
                                                    len -= op;
                                                    do {
                                                        output[_out++] = s_window[from++];
                                                    } while (--op);
                                                    from = _out - dist;  /* rest from output */
                                                    from_source = output;
                                                }
                                            }
                                            else if (wnext < op) {      /* wrap around window */
                                                from += wsize + wnext - op;
                                                op -= wnext;
                                                if (op < len) {         /* some from end of window */
                                                    len -= op;
                                                    do {
                                                        output[_out++] = s_window[from++];
                                                    } while (--op);
                                                    from = 0;
                                                    if (wnext < len) {  /* some from start of window */
                                                        op = wnext;
                                                        len -= op;
                                                        do {
                                                            output[_out++] = s_window[from++];
                                                        } while (--op);
                                                        from = _out - dist;      /* rest from output */
                                                        from_source = output;
                                                    }
                                                }
                                            }
                                            else {                      /* contiguous in window */
                                                from += wnext - op;
                                                if (op < len) {         /* some from window */
                                                    len -= op;
                                                    do {
                                                        output[_out++] = s_window[from++];
                                                    } while (--op);
                                                    from = _out - dist;  /* rest from output */
                                                    from_source = output;
                                                }
                                            }
                                            while (len > 2) {
                                                output[_out++] = from_source[from++];
                                                output[_out++] = from_source[from++];
                                                output[_out++] = from_source[from++];
                                                len -= 3;
                                            }
                                            if (len) {
                                                output[_out++] = from_source[from++];
                                                if (len > 1) {
                                                    output[_out++] = from_source[from++];
                                                }
                                            }
                                        }
                                        else {
                                            from = _out - dist;          /* copy direct from output */
                                            do {                        /* minimum length is three */
                                                output[_out++] = output[from++];
                                                output[_out++] = output[from++];
                                                output[_out++] = output[from++];
                                                len -= 3;
                                            } while (len > 2);
                                            if (len) {
                                                output[_out++] = output[from++];
                                                if (len > 1) {
                                                    output[_out++] = output[from++];
                                                }
                                            }
                                        }
                                    }
                                    else if ((op & 64) === 0) {          /* 2nd level distance code */
                                        here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                                        continue dodist;
                                    }
                                    else {
                                        strm.msg = 'invalid distance code';
                                        state.mode = BAD;
                                        break top;
                                    }

                                    break; // need to emulate goto via "continue"
                                }
                        }
                        else if ((op & 64) === 0) {              /* 2nd level length code */
                            here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                            continue dolen;
                        }
                        else if (op & 32) {                     /* end-of-block */
                            //Tracevv((stderr, "inflate:         end of block\n"));
                            state.mode = TYPE;
                            break top;
                        }
                        else {
                            strm.msg = 'invalid literal/length code';
                            state.mode = BAD;
                            break top;
                        }

                        break; // need to emulate goto via "continue"
                    }
            } while (_in < last && _out < end);

        /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
        len = bits >> 3;
        _in -= len;
        bits -= len << 3;
        hold &= (1 << bits) - 1;

        /* update state and return */
        strm.next_in = _in;
        strm.next_out = _out;
        strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
        strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
        state.hold = hold;
        state.bits = bits;
        return;
    };

},{}],8:[function(require,module,exports){
    'use strict';


    var utils = require('../utils/common');
    var adler32 = require('./adler32');
    var crc32   = require('./crc32');
    var inflate_fast = require('./inffast');
    var inflate_table = require('./inftrees');

    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
    var Z_FINISH        = 4;
    var Z_BLOCK         = 5;
    var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK            = 0;
    var Z_STREAM_END    = 1;
    var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
    var Z_STREAM_ERROR  = -2;
    var Z_DATA_ERROR    = -3;
    var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;

    /* The deflate compression method */
    var Z_DEFLATED  = 8;


    /* STATES ====================================================================*/
    /* ===========================================================================*/


    var    HEAD = 1;       /* i: waiting for magic header */
    var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
    var    TIME = 3;       /* i: waiting for modification time (gzip) */
    var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
    var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
    var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
    var    NAME = 7;       /* i: waiting for end of file name (gzip) */
    var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
    var    HCRC = 9;       /* i: waiting for header crc (gzip) */
    var    DICTID = 10;    /* i: waiting for dictionary check value */
    var    DICT = 11;      /* waiting for inflateSetDictionary() call */
    var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
    var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
    var        STORED = 14;    /* i: waiting for stored size (length and complement) */
    var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
    var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
    var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
    var        LENLENS = 18;   /* i: waiting for code length code lengths */
    var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
    var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
    var            LEN = 21;       /* i: waiting for length/lit/eob code */
    var            LENEXT = 22;    /* i: waiting for length extra bits */
    var            DIST = 23;      /* i: waiting for distance code */
    var            DISTEXT = 24;   /* i: waiting for distance extra bits */
    var            MATCH = 25;     /* o: waiting for output space to copy string */
    var            LIT = 26;       /* o: waiting for output space to write literal */
    var    CHECK = 27;     /* i: waiting for 32-bit check value */
    var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
    var    DONE = 29;      /* finished check, done -- remain here until reset */
    var    BAD = 30;       /* got a data error -- remain here until reset */
    var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
    var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

    /* ===========================================================================*/



    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

    var MAX_WBITS = 15;
    /* 32K LZ77 window */
    var DEF_WBITS = MAX_WBITS;


    function ZSWAP32(q) {
        return  (((q >>> 24) & 0xff) +
        ((q >>> 8) & 0xff00) +
        ((q & 0xff00) << 8) +
        ((q & 0xff) << 24));
    }


    function InflateState() {
        this.mode = 0;             /* current inflate mode */
        this.last = false;          /* true if processing last block */
        this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
        this.havedict = false;      /* true if dictionary provided */
        this.flags = 0;             /* gzip header method and flags (0 if zlib) */
        this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
        this.check = 0;             /* protected copy of check value */
        this.total = 0;             /* protected copy of output count */
        // TODO: may be {}
        this.head = null;           /* where to save gzip header information */

        /* sliding window */
        this.wbits = 0;             /* log base 2 of requested window size */
        this.wsize = 0;             /* window size or zero if not using window */
        this.whave = 0;             /* valid bytes in the window */
        this.wnext = 0;             /* window write index */
        this.window = null;         /* allocated sliding window, if needed */

        /* bit accumulator */
        this.hold = 0;              /* input bit accumulator */
        this.bits = 0;              /* number of bits in "in" */

        /* for string and stored block copying */
        this.length = 0;            /* literal or length of data to copy */
        this.offset = 0;            /* distance back to copy string from */

        /* for table and code decoding */
        this.extra = 0;             /* extra bits needed */

        /* fixed and dynamic code tables */
        this.lencode = null;          /* starting table for length/literal codes */
        this.distcode = null;         /* starting table for distance codes */
        this.lenbits = 0;           /* index bits for lencode */
        this.distbits = 0;          /* index bits for distcode */

        /* dynamic table building */
        this.ncode = 0;             /* number of code length code lengths */
        this.nlen = 0;              /* number of length code lengths */
        this.ndist = 0;             /* number of distance code lengths */
        this.have = 0;              /* number of code lengths in lens[] */
        this.next = null;              /* next available space in codes[] */

        this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
        this.work = new utils.Buf16(288); /* work area for code table building */

        /*
         because we don't have pointers in js, we use lencode and distcode directly
         as buffers so we don't need codes
         */
        //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
        this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
        this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
        this.sane = 0;                   /* if false, allow invalid distance too far */
        this.back = 0;                   /* bits back of last unprocessed length/lit */
        this.was = 0;                    /* initial length of match */
    }

    function inflateResetKeep(strm) {
        var state;

        if (!strm || !strm.state) { return Z_STREAM_ERROR; }
        state = strm.state;
        strm.total_in = strm.total_out = state.total = 0;
        strm.msg = ''; /*Z_NULL*/
        if (state.wrap) {       /* to support ill-conceived Java test suite */
            strm.adler = state.wrap & 1;
        }
        state.mode = HEAD;
        state.last = 0;
        state.havedict = 0;
        state.dmax = 32768;
        state.head = null/*Z_NULL*/;
        state.hold = 0;
        state.bits = 0;
        //state.lencode = state.distcode = state.next = state.codes;
        state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
        state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

        state.sane = 1;
        state.back = -1;
        //Tracev((stderr, "inflate: reset\n"));
        return Z_OK;
    }

    function inflateReset(strm) {
        var state;

        if (!strm || !strm.state) { return Z_STREAM_ERROR; }
        state = strm.state;
        state.wsize = 0;
        state.whave = 0;
        state.wnext = 0;
        return inflateResetKeep(strm);

    }

    function inflateReset2(strm, windowBits) {
        var wrap;
        var state;

        /* get the state */
        if (!strm || !strm.state) { return Z_STREAM_ERROR; }
        state = strm.state;

        /* extract wrap request from windowBits parameter */
        if (windowBits < 0) {
            wrap = 0;
            windowBits = -windowBits;
        }
        else {
            wrap = (windowBits >> 4) + 1;
            if (windowBits < 48) {
                windowBits &= 15;
            }
        }

        /* set number of window bits, free window if different */
        if (windowBits && (windowBits < 8 || windowBits > 15)) {
            return Z_STREAM_ERROR;
        }
        if (state.window !== null && state.wbits !== windowBits) {
            state.window = null;
        }

        /* update state and reset the rest of it */
        state.wrap = wrap;
        state.wbits = windowBits;
        return inflateReset(strm);
    }

    function inflateInit2(strm, windowBits) {
        var ret;
        var state;

        if (!strm) { return Z_STREAM_ERROR; }
        //strm.msg = Z_NULL;                 /* in case we return an error */

        state = new InflateState();

        //if (state === Z_NULL) return Z_MEM_ERROR;
        //Tracev((stderr, "inflate: allocated\n"));
        strm.state = state;
        state.window = null/*Z_NULL*/;
        ret = inflateReset2(strm, windowBits);
        if (ret !== Z_OK) {
            strm.state = null/*Z_NULL*/;
        }
        return ret;
    }

    function inflateInit(strm) {
        return inflateInit2(strm, DEF_WBITS);
    }


    /*
     Return state with length and distance decoding tables and index sizes set to
     fixed code decoding.  Normally this returns fixed tables from inffixed.h.
     If BUILDFIXED is defined, then instead this routine builds the tables the
     first time it's called, and returns those tables the first time and
     thereafter.  This reduces the size of the code by about 2K bytes, in
     exchange for a little execution time.  However, BUILDFIXED should not be
     used for threaded applications, since the rewriting of the tables and virgin
     may not be thread-safe.
     */
    var virgin = true;

    var lenfix, distfix; // We have no pointers in JS, so keep tables separate

    function fixedtables(state) {
        /* build fixed huffman tables if first call (may not be thread safe) */
        if (virgin) {
            var sym;

            lenfix = new utils.Buf32(512);
            distfix = new utils.Buf32(32);

            /* literal/length table */
            sym = 0;
            while (sym < 144) { state.lens[sym++] = 8; }
            while (sym < 256) { state.lens[sym++] = 9; }
            while (sym < 280) { state.lens[sym++] = 7; }
            while (sym < 288) { state.lens[sym++] = 8; }

            inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, {bits: 9});

            /* distance table */
            sym = 0;
            while (sym < 32) { state.lens[sym++] = 5; }

            inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, {bits: 5});

            /* do this just once */
            virgin = false;
        }

        state.lencode = lenfix;
        state.lenbits = 9;
        state.distcode = distfix;
        state.distbits = 5;
    }


    /*
     Update the window with the last wsize (normally 32K) bytes written before
     returning.  If window does not exist yet, create it.  This is only called
     when a window is already in use, or when output has been written during this
     inflate call, but the end of the deflate stream has not been reached yet.
     It is also called to create a window for dictionary data when a dictionary
     is loaded.

     Providing output buffers larger than 32K to inflate() should provide a speed
     advantage, since only the last 32K of output is copied to the sliding window
     upon return from inflate(), and since all distances after the first 32K of
     output will fall in the output data, making match copies simpler and faster.
     The advantage may be dependent on the size of the processor's data caches.
     */
    function updatewindow(strm, src, end, copy) {
        var dist;
        var state = strm.state;

        /* if it hasn't been done already, allocate space for the window */
        if (state.window === null) {
            state.wsize = 1 << state.wbits;
            state.wnext = 0;
            state.whave = 0;

            state.window = new utils.Buf8(state.wsize);
        }

        /* copy state->wsize or less output bytes into the circular window */
        if (copy >= state.wsize) {
            utils.arraySet(state.window,src, end - state.wsize, state.wsize, 0);
            state.wnext = 0;
            state.whave = state.wsize;
        }
        else {
            dist = state.wsize - state.wnext;
            if (dist > copy) {
                dist = copy;
            }
            //zmemcpy(state->window + state->wnext, end - copy, dist);
            utils.arraySet(state.window,src, end - copy, dist, state.wnext);
            copy -= dist;
            if (copy) {
                //zmemcpy(state->window, end - copy, copy);
                utils.arraySet(state.window,src, end - copy, copy, 0);
                state.wnext = copy;
                state.whave = state.wsize;
            }
            else {
                state.wnext += dist;
                if (state.wnext === state.wsize) { state.wnext = 0; }
                if (state.whave < state.wsize) { state.whave += dist; }
            }
        }
        return 0;
    }

    function inflate(strm, flush) {
        var state;
        var input, output;          // input/output buffers
        var next;                   /* next input INDEX */
        var put;                    /* next output INDEX */
        var have, left;             /* available input and output */
        var hold;                   /* bit buffer */
        var bits;                   /* bits in bit buffer */
        var _in, _out;              /* save starting available input and output */
        var copy;                   /* number of stored or match bytes to copy */
        var from;                   /* where to copy match bytes from */
        var from_source;
        var here = 0;               /* current decoding table entry */
        var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
        //var last;                   /* parent table entry */
        var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
        var len;                    /* length to copy for repeats, bits to drop */
        var ret;                    /* return code */
        var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
        var opts;

        var n; // temporary var for NEED_BITS

        var order = /* permutation of code lengths */
            [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


        if (!strm || !strm.state || !strm.output ||
            (!strm.input && strm.avail_in !== 0)) {
            return Z_STREAM_ERROR;
        }

        state = strm.state;
        if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


        //--- LOAD() ---
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        //---

        _in = have;
        _out = left;
        ret = Z_OK;

        inf_leave: // goto emulation
            for (;;) {
                switch (state.mode) {
                    case HEAD:
                        if (state.wrap === 0) {
                            state.mode = TYPEDO;
                            break;
                        }
                        //=== NEEDBITS(16);
                        while (bits < 16) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
                            state.check = 0/*crc32(0L, Z_NULL, 0)*/;
                            //=== CRC2(state.check, hold);
                            hbuf[0] = hold & 0xff;
                            hbuf[1] = (hold >>> 8) & 0xff;
                            state.check = crc32(state.check, hbuf, 2, 0);
                            //===//

                            //=== INITBITS();
                            hold = 0;
                            bits = 0;
                            //===//
                            state.mode = FLAGS;
                            break;
                        }
                        state.flags = 0;           /* expect zlib header */
                        if (state.head) {
                            state.head.done = false;
                        }
                        if (!(state.wrap & 1) ||   /* check if zlib header allowed */
                            (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
                            strm.msg = 'incorrect header check';
                            state.mode = BAD;
                            break;
                        }
                        if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
                            strm.msg = 'unknown compression method';
                            state.mode = BAD;
                            break;
                        }
                        //--- DROPBITS(4) ---//
                        hold >>>= 4;
                        bits -= 4;
                        //---//
                        len = (hold & 0x0f)/*BITS(4)*/ + 8;
                        if (state.wbits === 0) {
                            state.wbits = len;
                        }
                        else if (len > state.wbits) {
                            strm.msg = 'invalid window size';
                            state.mode = BAD;
                            break;
                        }
                        state.dmax = 1 << len;
                        //Tracev((stderr, "inflate:   zlib header ok\n"));
                        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
                        state.mode = hold & 0x200 ? DICTID : TYPE;
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        break;
                    case FLAGS:
                        //=== NEEDBITS(16); */
                        while (bits < 16) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        state.flags = hold;
                        if ((state.flags & 0xff) !== Z_DEFLATED) {
                            strm.msg = 'unknown compression method';
                            state.mode = BAD;
                            break;
                        }
                        if (state.flags & 0xe000) {
                            strm.msg = 'unknown header flags set';
                            state.mode = BAD;
                            break;
                        }
                        if (state.head) {
                            state.head.text = ((hold >> 8) & 1);
                        }
                        if (state.flags & 0x0200) {
                            //=== CRC2(state.check, hold);
                            hbuf[0] = hold & 0xff;
                            hbuf[1] = (hold >>> 8) & 0xff;
                            state.check = crc32(state.check, hbuf, 2, 0);
                            //===//
                        }
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        state.mode = TIME;
                    /* falls through */
                    case TIME:
                        //=== NEEDBITS(32); */
                        while (bits < 32) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        if (state.head) {
                            state.head.time = hold;
                        }
                        if (state.flags & 0x0200) {
                            //=== CRC4(state.check, hold)
                            hbuf[0] = hold & 0xff;
                            hbuf[1] = (hold >>> 8) & 0xff;
                            hbuf[2] = (hold >>> 16) & 0xff;
                            hbuf[3] = (hold >>> 24) & 0xff;
                            state.check = crc32(state.check, hbuf, 4, 0);
                            //===
                        }
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        state.mode = OS;
                    /* falls through */
                    case OS:
                        //=== NEEDBITS(16); */
                        while (bits < 16) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        if (state.head) {
                            state.head.xflags = (hold & 0xff);
                            state.head.os = (hold >> 8);
                        }
                        if (state.flags & 0x0200) {
                            //=== CRC2(state.check, hold);
                            hbuf[0] = hold & 0xff;
                            hbuf[1] = (hold >>> 8) & 0xff;
                            state.check = crc32(state.check, hbuf, 2, 0);
                            //===//
                        }
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        state.mode = EXLEN;
                    /* falls through */
                    case EXLEN:
                        if (state.flags & 0x0400) {
                            //=== NEEDBITS(16); */
                            while (bits < 16) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            state.length = hold;
                            if (state.head) {
                                state.head.extra_len = hold;
                            }
                            if (state.flags & 0x0200) {
                                //=== CRC2(state.check, hold);
                                hbuf[0] = hold & 0xff;
                                hbuf[1] = (hold >>> 8) & 0xff;
                                state.check = crc32(state.check, hbuf, 2, 0);
                                //===//
                            }
                            //=== INITBITS();
                            hold = 0;
                            bits = 0;
                            //===//
                        }
                        else if (state.head) {
                            state.head.extra = null/*Z_NULL*/;
                        }
                        state.mode = EXTRA;
                    /* falls through */
                    case EXTRA:
                        if (state.flags & 0x0400) {
                            copy = state.length;
                            if (copy > have) { copy = have; }
                            if (copy) {
                                if (state.head) {
                                    len = state.head.extra_len - state.length;
                                    if (!state.head.extra) {
                                        // Use untyped array for more conveniend processing later
                                        state.head.extra = new Array(state.head.extra_len);
                                    }
                                    utils.arraySet(
                                        state.head.extra,
                                        input,
                                        next,
                                        // extra field is limited to 65536 bytes
                                        // - no need for additional size check
                                        copy,
                                        /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                                        len
                                    );
                                    //zmemcpy(state.head.extra + len, next,
                                    //        len + copy > state.head.extra_max ?
                                    //        state.head.extra_max - len : copy);
                                }
                                if (state.flags & 0x0200) {
                                    state.check = crc32(state.check, input, copy, next);
                                }
                                have -= copy;
                                next += copy;
                                state.length -= copy;
                            }
                            if (state.length) { break inf_leave; }
                        }
                        state.length = 0;
                        state.mode = NAME;
                    /* falls through */
                    case NAME:
                        if (state.flags & 0x0800) {
                            if (have === 0) { break inf_leave; }
                            copy = 0;
                            do {
                                // TODO: 2 or 1 bytes?
                                len = input[next + copy++];
                                /* use constant limit because in js we should not preallocate memory */
                                if (state.head && len &&
                                    (state.length < 65536 /*state.head.name_max*/)) {
                                    state.head.name += String.fromCharCode(len);
                                }
                            } while (len && copy < have);

                            if (state.flags & 0x0200) {
                                state.check = crc32(state.check, input, copy, next);
                            }
                            have -= copy;
                            next += copy;
                            if (len) { break inf_leave; }
                        }
                        else if (state.head) {
                            state.head.name = null;
                        }
                        state.length = 0;
                        state.mode = COMMENT;
                    /* falls through */
                    case COMMENT:
                        if (state.flags & 0x1000) {
                            if (have === 0) { break inf_leave; }
                            copy = 0;
                            do {
                                len = input[next + copy++];
                                /* use constant limit because in js we should not preallocate memory */
                                if (state.head && len &&
                                    (state.length < 65536 /*state.head.comm_max*/)) {
                                    state.head.comment += String.fromCharCode(len);
                                }
                            } while (len && copy < have);
                            if (state.flags & 0x0200) {
                                state.check = crc32(state.check, input, copy, next);
                            }
                            have -= copy;
                            next += copy;
                            if (len) { break inf_leave; }
                        }
                        else if (state.head) {
                            state.head.comment = null;
                        }
                        state.mode = HCRC;
                    /* falls through */
                    case HCRC:
                        if (state.flags & 0x0200) {
                            //=== NEEDBITS(16); */
                            while (bits < 16) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            if (hold !== (state.check & 0xffff)) {
                                strm.msg = 'header crc mismatch';
                                state.mode = BAD;
                                break;
                            }
                            //=== INITBITS();
                            hold = 0;
                            bits = 0;
                            //===//
                        }
                        if (state.head) {
                            state.head.hcrc = ((state.flags >> 9) & 1);
                            state.head.done = true;
                        }
                        strm.adler = state.check = 0 /*crc32(0L, Z_NULL, 0)*/;
                        state.mode = TYPE;
                        break;
                    case DICTID:
                        //=== NEEDBITS(32); */
                        while (bits < 32) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        strm.adler = state.check = ZSWAP32(hold);
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        state.mode = DICT;
                    /* falls through */
                    case DICT:
                        if (state.havedict === 0) {
                            //--- RESTORE() ---
                            strm.next_out = put;
                            strm.avail_out = left;
                            strm.next_in = next;
                            strm.avail_in = have;
                            state.hold = hold;
                            state.bits = bits;
                            //---
                            return Z_NEED_DICT;
                        }
                        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
                        state.mode = TYPE;
                    /* falls through */
                    case TYPE:
                        if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
                    /* falls through */
                    case TYPEDO:
                        if (state.last) {
                            //--- BYTEBITS() ---//
                            hold >>>= bits & 7;
                            bits -= bits & 7;
                            //---//
                            state.mode = CHECK;
                            break;
                        }
                        //=== NEEDBITS(3); */
                        while (bits < 3) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        state.last = (hold & 0x01)/*BITS(1)*/;
                        //--- DROPBITS(1) ---//
                        hold >>>= 1;
                        bits -= 1;
                        //---//

                        switch ((hold & 0x03)/*BITS(2)*/) {
                            case 0:                             /* stored block */
                                //Tracev((stderr, "inflate:     stored block%s\n",
                                //        state.last ? " (last)" : ""));
                                state.mode = STORED;
                                break;
                            case 1:                             /* fixed block */
                                fixedtables(state);
                                //Tracev((stderr, "inflate:     fixed codes block%s\n",
                                //        state.last ? " (last)" : ""));
                                state.mode = LEN_;             /* decode codes */
                                if (flush === Z_TREES) {
                                    //--- DROPBITS(2) ---//
                                    hold >>>= 2;
                                    bits -= 2;
                                    //---//
                                    break inf_leave;
                                }
                                break;
                            case 2:                             /* dynamic block */
                                //Tracev((stderr, "inflate:     dynamic codes block%s\n",
                                //        state.last ? " (last)" : ""));
                                state.mode = TABLE;
                                break;
                            case 3:
                                strm.msg = 'invalid block type';
                                state.mode = BAD;
                        }
                        //--- DROPBITS(2) ---//
                        hold >>>= 2;
                        bits -= 2;
                        //---//
                        break;
                    case STORED:
                        //--- BYTEBITS() ---// /* go to byte boundary */
                        hold >>>= bits & 7;
                        bits -= bits & 7;
                        //---//
                        //=== NEEDBITS(32); */
                        while (bits < 32) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
                            strm.msg = 'invalid stored block lengths';
                            state.mode = BAD;
                            break;
                        }
                        state.length = hold & 0xffff;
                        //Tracev((stderr, "inflate:       stored length %u\n",
                        //        state.length));
                        //=== INITBITS();
                        hold = 0;
                        bits = 0;
                        //===//
                        state.mode = COPY_;
                        if (flush === Z_TREES) { break inf_leave; }
                    /* falls through */
                    case COPY_:
                        state.mode = COPY;
                    /* falls through */
                    case COPY:
                        copy = state.length;
                        if (copy) {
                            if (copy > have) { copy = have; }
                            if (copy > left) { copy = left; }
                            if (copy === 0) { break inf_leave; }
                            //--- zmemcpy(put, next, copy); ---
                            utils.arraySet(output, input, next, copy, put);
                            //---//
                            have -= copy;
                            next += copy;
                            left -= copy;
                            put += copy;
                            state.length -= copy;
                            break;
                        }
                        //Tracev((stderr, "inflate:       stored end\n"));
                        state.mode = TYPE;
                        break;
                    case TABLE:
                        //=== NEEDBITS(14); */
                        while (bits < 14) {
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                        }
                        //===//
                        state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
                        //--- DROPBITS(5) ---//
                        hold >>>= 5;
                        bits -= 5;
                        //---//
                        state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
                        //--- DROPBITS(5) ---//
                        hold >>>= 5;
                        bits -= 5;
                        //---//
                        state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
                        //--- DROPBITS(4) ---//
                        hold >>>= 4;
                        bits -= 4;
                        //---//
//#ifndef PKZIP_BUG_WORKAROUND
                        if (state.nlen > 286 || state.ndist > 30) {
                            strm.msg = 'too many length or distance symbols';
                            state.mode = BAD;
                            break;
                        }
//#endif
                        //Tracev((stderr, "inflate:       table sizes ok\n"));
                        state.have = 0;
                        state.mode = LENLENS;
                    /* falls through */
                    case LENLENS:
                        while (state.have < state.ncode) {
                            //=== NEEDBITS(3);
                            while (bits < 3) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
                            //--- DROPBITS(3) ---//
                            hold >>>= 3;
                            bits -= 3;
                            //---//
                        }
                        while (state.have < 19) {
                            state.lens[order[state.have++]] = 0;
                        }
                        // We have separate tables & no pointers. 2 commented lines below not needed.
                        //state.next = state.codes;
                        //state.lencode = state.next;
                        // Switch to use dynamic table
                        state.lencode = state.lendyn;
                        state.lenbits = 7;

                        opts = {bits: state.lenbits};
                        ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
                        state.lenbits = opts.bits;

                        if (ret) {
                            strm.msg = 'invalid code lengths set';
                            state.mode = BAD;
                            break;
                        }
                        //Tracev((stderr, "inflate:       code lengths ok\n"));
                        state.have = 0;
                        state.mode = CODELENS;
                    /* falls through */
                    case CODELENS:
                        while (state.have < state.nlen + state.ndist) {
                            for (;;) {
                                here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
                                here_bits = here >>> 24;
                                here_op = (here >>> 16) & 0xff;
                                here_val = here & 0xffff;

                                if ((here_bits) <= bits) { break; }
                                //--- PULLBYTE() ---//
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                                //---//
                            }
                            if (here_val < 16) {
                                //--- DROPBITS(here.bits) ---//
                                hold >>>= here_bits;
                                bits -= here_bits;
                                //---//
                                state.lens[state.have++] = here_val;
                            }
                            else {
                                if (here_val === 16) {
                                    //=== NEEDBITS(here.bits + 2);
                                    n = here_bits + 2;
                                    while (bits < n) {
                                        if (have === 0) { break inf_leave; }
                                        have--;
                                        hold += input[next++] << bits;
                                        bits += 8;
                                    }
                                    //===//
                                    //--- DROPBITS(here.bits) ---//
                                    hold >>>= here_bits;
                                    bits -= here_bits;
                                    //---//
                                    if (state.have === 0) {
                                        strm.msg = 'invalid bit length repeat';
                                        state.mode = BAD;
                                        break;
                                    }
                                    len = state.lens[state.have - 1];
                                    copy = 3 + (hold & 0x03);//BITS(2);
                                    //--- DROPBITS(2) ---//
                                    hold >>>= 2;
                                    bits -= 2;
                                    //---//
                                }
                                else if (here_val === 17) {
                                    //=== NEEDBITS(here.bits + 3);
                                    n = here_bits + 3;
                                    while (bits < n) {
                                        if (have === 0) { break inf_leave; }
                                        have--;
                                        hold += input[next++] << bits;
                                        bits += 8;
                                    }
                                    //===//
                                    //--- DROPBITS(here.bits) ---//
                                    hold >>>= here_bits;
                                    bits -= here_bits;
                                    //---//
                                    len = 0;
                                    copy = 3 + (hold & 0x07);//BITS(3);
                                    //--- DROPBITS(3) ---//
                                    hold >>>= 3;
                                    bits -= 3;
                                    //---//
                                }
                                else {
                                    //=== NEEDBITS(here.bits + 7);
                                    n = here_bits + 7;
                                    while (bits < n) {
                                        if (have === 0) { break inf_leave; }
                                        have--;
                                        hold += input[next++] << bits;
                                        bits += 8;
                                    }
                                    //===//
                                    //--- DROPBITS(here.bits) ---//
                                    hold >>>= here_bits;
                                    bits -= here_bits;
                                    //---//
                                    len = 0;
                                    copy = 11 + (hold & 0x7f);//BITS(7);
                                    //--- DROPBITS(7) ---//
                                    hold >>>= 7;
                                    bits -= 7;
                                    //---//
                                }
                                if (state.have + copy > state.nlen + state.ndist) {
                                    strm.msg = 'invalid bit length repeat';
                                    state.mode = BAD;
                                    break;
                                }
                                while (copy--) {
                                    state.lens[state.have++] = len;
                                }
                            }
                        }

                        /* handle error breaks in while */
                        if (state.mode === BAD) { break; }

                        /* check for end-of-block code (better have one) */
                        if (state.lens[256] === 0) {
                            strm.msg = 'invalid code -- missing end-of-block';
                            state.mode = BAD;
                            break;
                        }

                        /* build code tables -- note: do not change the lenbits or distbits
                         values here (9 and 6) without reading the comments in inftrees.h
                         concerning the ENOUGH constants, which depend on those values */
                        state.lenbits = 9;

                        opts = {bits: state.lenbits};
                        ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
                        // We have separate tables & no pointers. 2 commented lines below not needed.
                        // state.next_index = opts.table_index;
                        state.lenbits = opts.bits;
                        // state.lencode = state.next;

                        if (ret) {
                            strm.msg = 'invalid literal/lengths set';
                            state.mode = BAD;
                            break;
                        }

                        state.distbits = 6;
                        //state.distcode.copy(state.codes);
                        // Switch to use dynamic table
                        state.distcode = state.distdyn;
                        opts = {bits: state.distbits};
                        ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
                        // We have separate tables & no pointers. 2 commented lines below not needed.
                        // state.next_index = opts.table_index;
                        state.distbits = opts.bits;
                        // state.distcode = state.next;

                        if (ret) {
                            strm.msg = 'invalid distances set';
                            state.mode = BAD;
                            break;
                        }
                        //Tracev((stderr, 'inflate:       codes ok\n'));
                        state.mode = LEN_;
                        if (flush === Z_TREES) { break inf_leave; }
                    /* falls through */
                    case LEN_:
                        state.mode = LEN;
                    /* falls through */
                    case LEN:
                        if (have >= 6 && left >= 258) {
                            //--- RESTORE() ---
                            strm.next_out = put;
                            strm.avail_out = left;
                            strm.next_in = next;
                            strm.avail_in = have;
                            state.hold = hold;
                            state.bits = bits;
                            //---
                            inflate_fast(strm, _out);
                            //--- LOAD() ---
                            put = strm.next_out;
                            output = strm.output;
                            left = strm.avail_out;
                            next = strm.next_in;
                            input = strm.input;
                            have = strm.avail_in;
                            hold = state.hold;
                            bits = state.bits;
                            //---

                            if (state.mode === TYPE) {
                                state.back = -1;
                            }
                            break;
                        }
                        state.back = 0;
                        for (;;) {
                            here = state.lencode[hold & ((1 << state.lenbits) -1)];  /*BITS(state.lenbits)*/
                            here_bits = here >>> 24;
                            here_op = (here >>> 16) & 0xff;
                            here_val = here & 0xffff;

                            if (here_bits <= bits) { break; }
                            //--- PULLBYTE() ---//
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                            //---//
                        }
                        if (here_op && (here_op & 0xf0) === 0) {
                            last_bits = here_bits;
                            last_op = here_op;
                            last_val = here_val;
                            for (;;) {
                                here = state.lencode[last_val +
                                ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                                here_bits = here >>> 24;
                                here_op = (here >>> 16) & 0xff;
                                here_val = here & 0xffff;

                                if ((last_bits + here_bits) <= bits) { break; }
                                //--- PULLBYTE() ---//
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                                //---//
                            }
                            //--- DROPBITS(last.bits) ---//
                            hold >>>= last_bits;
                            bits -= last_bits;
                            //---//
                            state.back += last_bits;
                        }
                        //--- DROPBITS(here.bits) ---//
                        hold >>>= here_bits;
                        bits -= here_bits;
                        //---//
                        state.back += here_bits;
                        state.length = here_val;
                        if (here_op === 0) {
                            //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
                            //        "inflate:         literal '%c'\n" :
                            //        "inflate:         literal 0x%02x\n", here.val));
                            state.mode = LIT;
                            break;
                        }
                        if (here_op & 32) {
                            //Tracevv((stderr, "inflate:         end of block\n"));
                            state.back = -1;
                            state.mode = TYPE;
                            break;
                        }
                        if (here_op & 64) {
                            strm.msg = 'invalid literal/length code';
                            state.mode = BAD;
                            break;
                        }
                        state.extra = here_op & 15;
                        state.mode = LENEXT;
                    /* falls through */
                    case LENEXT:
                        if (state.extra) {
                            //=== NEEDBITS(state.extra);
                            n = state.extra;
                            while (bits < n) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            state.length += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
                            //--- DROPBITS(state.extra) ---//
                            hold >>>= state.extra;
                            bits -= state.extra;
                            //---//
                            state.back += state.extra;
                        }
                        //Tracevv((stderr, "inflate:         length %u\n", state.length));
                        state.was = state.length;
                        state.mode = DIST;
                    /* falls through */
                    case DIST:
                        for (;;) {
                            here = state.distcode[hold & ((1 << state.distbits) -1)];/*BITS(state.distbits)*/
                            here_bits = here >>> 24;
                            here_op = (here >>> 16) & 0xff;
                            here_val = here & 0xffff;

                            if ((here_bits) <= bits) { break; }
                            //--- PULLBYTE() ---//
                            if (have === 0) { break inf_leave; }
                            have--;
                            hold += input[next++] << bits;
                            bits += 8;
                            //---//
                        }
                        if ((here_op & 0xf0) === 0) {
                            last_bits = here_bits;
                            last_op = here_op;
                            last_val = here_val;
                            for (;;) {
                                here = state.distcode[last_val +
                                ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                                here_bits = here >>> 24;
                                here_op = (here >>> 16) & 0xff;
                                here_val = here & 0xffff;

                                if ((last_bits + here_bits) <= bits) { break; }
                                //--- PULLBYTE() ---//
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                                //---//
                            }
                            //--- DROPBITS(last.bits) ---//
                            hold >>>= last_bits;
                            bits -= last_bits;
                            //---//
                            state.back += last_bits;
                        }
                        //--- DROPBITS(here.bits) ---//
                        hold >>>= here_bits;
                        bits -= here_bits;
                        //---//
                        state.back += here_bits;
                        if (here_op & 64) {
                            strm.msg = 'invalid distance code';
                            state.mode = BAD;
                            break;
                        }
                        state.offset = here_val;
                        state.extra = (here_op) & 15;
                        state.mode = DISTEXT;
                    /* falls through */
                    case DISTEXT:
                        if (state.extra) {
                            //=== NEEDBITS(state.extra);
                            n = state.extra;
                            while (bits < n) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            state.offset += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
                            //--- DROPBITS(state.extra) ---//
                            hold >>>= state.extra;
                            bits -= state.extra;
                            //---//
                            state.back += state.extra;
                        }
//#ifdef INFLATE_STRICT
                        if (state.offset > state.dmax) {
                            strm.msg = 'invalid distance too far back';
                            state.mode = BAD;
                            break;
                        }
//#endif
                        //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
                        state.mode = MATCH;
                    /* falls through */
                    case MATCH:
                        if (left === 0) { break inf_leave; }
                        copy = _out - left;
                        if (state.offset > copy) {         /* copy from window */
                            copy = state.offset - copy;
                            if (copy > state.whave) {
                                if (state.sane) {
                                    strm.msg = 'invalid distance too far back';
                                    state.mode = BAD;
                                    break;
                                }
// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
                            }
                            if (copy > state.wnext) {
                                copy -= state.wnext;
                                from = state.wsize - copy;
                            }
                            else {
                                from = state.wnext - copy;
                            }
                            if (copy > state.length) { copy = state.length; }
                            from_source = state.window;
                        }
                        else {                              /* copy from output */
                            from_source = output;
                            from = put - state.offset;
                            copy = state.length;
                        }
                        if (copy > left) { copy = left; }
                        left -= copy;
                        state.length -= copy;
                        do {
                            output[put++] = from_source[from++];
                        } while (--copy);
                        if (state.length === 0) { state.mode = LEN; }
                        break;
                    case LIT:
                        if (left === 0) { break inf_leave; }
                        output[put++] = state.length;
                        left--;
                        state.mode = LEN;
                        break;
                    case CHECK:
                        if (state.wrap) {
                            //=== NEEDBITS(32);
                            while (bits < 32) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                // Use '|' insdead of '+' to make sure that result is signed
                                hold |= input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            _out -= left;
                            strm.total_out += _out;
                            state.total += _out;
                            if (_out) {
                                strm.adler = state.check =
                                    /*UPDATE(state.check, put - _out, _out);*/
                                    (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

                            }
                            _out = left;
                            // NB: crc32 stored as signed 32-bit int, ZSWAP32 returns signed too
                            if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) {
                                strm.msg = 'incorrect data check';
                                state.mode = BAD;
                                break;
                            }
                            //=== INITBITS();
                            hold = 0;
                            bits = 0;
                            //===//
                            //Tracev((stderr, "inflate:   check matches trailer\n"));
                        }
                        state.mode = LENGTH;
                    /* falls through */
                    case LENGTH:
                        if (state.wrap && state.flags) {
                            //=== NEEDBITS(32);
                            while (bits < 32) {
                                if (have === 0) { break inf_leave; }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            //===//
                            if (hold !== (state.total & 0xffffffff)) {
                                strm.msg = 'incorrect length check';
                                state.mode = BAD;
                                break;
                            }
                            //=== INITBITS();
                            hold = 0;
                            bits = 0;
                            //===//
                            //Tracev((stderr, "inflate:   length matches trailer\n"));
                        }
                        state.mode = DONE;
                    /* falls through */
                    case DONE:
                        ret = Z_STREAM_END;
                        break inf_leave;
                    case BAD:
                        ret = Z_DATA_ERROR;
                        break inf_leave;
                    case MEM:
                        return Z_MEM_ERROR;
                    case SYNC:
                    /* falls through */
                    default:
                        return Z_STREAM_ERROR;
                }
            }

        // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

        /*
         Return from inflate(), updating the total counts and the check value.
         If there was no progress during the inflate() call, return a buffer
         error.  Call updatewindow() to create and/or update the window state.
         Note: a memory error from inflate() is non-recoverable.
         */

        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---

        if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
            (state.mode < CHECK || flush !== Z_FINISH))) {
            if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
                state.mode = MEM;
                return Z_MEM_ERROR;
            }
        }
        _in -= strm.avail_in;
        _out -= strm.avail_out;
        strm.total_in += _in;
        strm.total_out += _out;
        state.total += _out;
        if (state.wrap && _out) {
            strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
                (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
        }
        strm.data_type = state.bits + (state.last ? 64 : 0) +
            (state.mode === TYPE ? 128 : 0) +
            (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
        if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
            ret = Z_BUF_ERROR;
        }
        return ret;
    }

    function inflateEnd(strm) {

        if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
            return Z_STREAM_ERROR;
        }

        var state = strm.state;
        if (state.window) {
            state.window = null;
        }
        strm.state = null;
        return Z_OK;
    }

    function inflateGetHeader(strm, head) {
        var state;

        /* check state */
        if (!strm || !strm.state) { return Z_STREAM_ERROR; }
        state = strm.state;
        if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

        /* save header structure */
        state.head = head;
        head.done = false;
        return Z_OK;
    }


    exports.inflateReset = inflateReset;
    exports.inflateReset2 = inflateReset2;
    exports.inflateResetKeep = inflateResetKeep;
    exports.inflateInit = inflateInit;
    exports.inflateInit2 = inflateInit2;
    exports.inflate = inflate;
    exports.inflateEnd = inflateEnd;
    exports.inflateGetHeader = inflateGetHeader;
    exports.inflateInfo = 'pako inflate (from Nodeca project)';

    /* Not implemented
     exports.inflateCopy = inflateCopy;
     exports.inflateGetDictionary = inflateGetDictionary;
     exports.inflateMark = inflateMark;
     exports.inflatePrime = inflatePrime;
     exports.inflateSetDictionary = inflateSetDictionary;
     exports.inflateSync = inflateSync;
     exports.inflateSyncPoint = inflateSyncPoint;
     exports.inflateUndermine = inflateUndermine;
     */

},{"../utils/common":1,"./adler32":3,"./crc32":5,"./inffast":7,"./inftrees":9}],9:[function(require,module,exports){
    'use strict';


    var utils = require('../utils/common');

    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;

    var lbase = [ /* Length codes 257..285 base */
        3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
        35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    ];

    var lext = [ /* Length codes 257..285 extra */
        16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
        19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
    ];

    var dbase = [ /* Distance codes 0..29 base */
        1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
        257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
        8193, 12289, 16385, 24577, 0, 0
    ];

    var dext = [ /* Distance codes 0..29 extra */
        16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
        23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
        28, 28, 29, 29, 64, 64
    ];

    module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
    {
        var bits = opts.bits;
        //here = opts.here; /* table entry for duplication */

        var len = 0;               /* a code's length in bits */
        var sym = 0;               /* index of code symbols */
        var min = 0, max = 0;          /* minimum and maximum code lengths */
        var root = 0;              /* number of index bits for root table */
        var curr = 0;              /* number of index bits for current table */
        var drop = 0;              /* code bits to drop for sub-table */
        var left = 0;                   /* number of prefix codes available */
        var used = 0;              /* code entries in table used */
        var huff = 0;              /* Huffman code */
        var incr;              /* for incrementing code, index */
        var fill;              /* index for replicating entries */
        var low;               /* low bits for current root entry */
        var mask;              /* mask for low root bits */
        var next;             /* next available space in table */
        var base = null;     /* base value table to use */
        var base_index = 0;
//  var shoextra;    /* extra bits table to use */
        var end;                    /* use base and extra for symbol > end */
        var count = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];    /* number of codes of each length */
        var offs = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];     /* offsets in table for each length */
        var extra = null;
        var extra_index = 0;

        var here_bits, here_op, here_val;

        /*
         Process a set of code lengths to create a canonical Huffman code.  The
         code lengths are lens[0..codes-1].  Each length corresponds to the
         symbols 0..codes-1.  The Huffman code is generated by first sorting the
         symbols by length from short to long, and retaining the symbol order
         for codes with equal lengths.  Then the code starts with all zero bits
         for the first code of the shortest length, and the codes are integer
         increments for the same length, and zeros are appended as the length
         increases.  For the deflate format, these bits are stored backwards
         from their more natural integer increment ordering, and so when the
         decoding tables are built in the large loop below, the integer codes
         are incremented backwards.

         This routine assumes, but does not check, that all of the entries in
         lens[] are in the range 0..MAXBITS.  The caller must assure this.
         1..MAXBITS is interpreted as that code length.  zero means that that
         symbol does not occur in this code.

         The codes are sorted by computing a count of codes for each length,
         creating from that a table of starting indices for each length in the
         sorted table, and then entering the symbols in order in the sorted
         table.  The sorted table is work[], with that space being provided by
         the caller.

         The length counts are used for other purposes as well, i.e. finding
         the minimum and maximum length codes, determining if there are any
         codes at all, checking for a valid set of lengths, and looking ahead
         at length counts to determine sub-table sizes when building the
         decoding tables.
         */

        /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
        for (len = 0; len <= MAXBITS; len++) {
            count[len] = 0;
        }
        for (sym = 0; sym < codes; sym++) {
            count[lens[lens_index + sym]]++;
        }

        /* bound code lengths, force root to be within code lengths */
        root = bits;
        for (max = MAXBITS; max >= 1; max--) {
            if (count[max] !== 0) { break; }
        }
        if (root > max) {
            root = max;
        }
        if (max === 0) {                     /* no symbols to code at all */
            //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
            //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
            //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
            table[table_index++] = (1 << 24) | (64 << 16) | 0;


            //table.op[opts.table_index] = 64;
            //table.bits[opts.table_index] = 1;
            //table.val[opts.table_index++] = 0;
            table[table_index++] = (1 << 24) | (64 << 16) | 0;

            opts.bits = 1;
            return 0;     /* no symbols, but wait for decoding to report error */
        }
        for (min = 1; min < max; min++) {
            if (count[min] !== 0) { break; }
        }
        if (root < min) {
            root = min;
        }

        /* check for an over-subscribed or incomplete set of lengths */
        left = 1;
        for (len = 1; len <= MAXBITS; len++) {
            left <<= 1;
            left -= count[len];
            if (left < 0) {
                return -1;
            }        /* over-subscribed */
        }
        if (left > 0 && (type === CODES || max !== 1)) {
            return -1;                      /* incomplete set */
        }

        /* generate offsets into symbol table for each length for sorting */
        offs[1] = 0;
        for (len = 1; len < MAXBITS; len++) {
            offs[len + 1] = offs[len] + count[len];
        }

        /* sort symbols by length, by symbol order within each length */
        for (sym = 0; sym < codes; sym++) {
            if (lens[lens_index + sym] !== 0) {
                work[offs[lens[lens_index + sym]]++] = sym;
            }
        }

        /*
         Create and fill in decoding tables.  In this loop, the table being
         filled is at next and has curr index bits.  The code being used is huff
         with length len.  That code is converted to an index by dropping drop
         bits off of the bottom.  For codes where len is less than drop + curr,
         those top drop + curr - len bits are incremented through all values to
         fill the table with replicated entries.

         root is the number of index bits for the root table.  When len exceeds
         root, sub-tables are created pointed to by the root entry with an index
         of the low root bits of huff.  This is saved in low to check for when a
         new sub-table should be started.  drop is zero when the root table is
         being filled, and drop is root when sub-tables are being filled.

         When a new sub-table is needed, it is necessary to look ahead in the
         code lengths to determine what size sub-table is needed.  The length
         counts are used for this, and so count[] is decremented as codes are
         entered in the tables.

         used keeps track of how many table entries have been allocated from the
         provided *table space.  It is checked for LENS and DIST tables against
         the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
         the initial root table size constants.  See the comments in inftrees.h
         for more information.

         sym increments through all symbols, and the loop terminates when
         all codes of length max, i.e. all codes, have been processed.  This
         routine permits incomplete codes, so another loop after this one fills
         in the rest of the decoding tables with invalid code markers.
         */

        /* set up for code type */
        // poor man optimization - use if-else instead of switch,
        // to avoid deopts in old v8
        if (type === CODES) {
            base = extra = work;    /* dummy value--not used */
            end = 19;

        } else if (type === LENS) {
            base = lbase;
            base_index -= 257;
            extra = lext;
            extra_index -= 257;
            end = 256;

        } else {                    /* DISTS */
            base = dbase;
            extra = dext;
            end = -1;
        }

        /* initialize opts for loop */
        huff = 0;                   /* starting code */
        sym = 0;                    /* starting code symbol */
        len = min;                  /* starting code length */
        next = table_index;              /* current table to fill in */
        curr = root;                /* current table index bits */
        drop = 0;                   /* current bits to drop from code for index */
        low = -1;                   /* trigger new sub-table when len > root */
        used = 1 << root;          /* use root table entries */
        mask = used - 1;            /* mask for comparing low */

        /* check available table space */
        if ((type === LENS && used > ENOUGH_LENS) ||
            (type === DISTS && used > ENOUGH_DISTS)) {
            return 1;
        }

        var i=0;
        /* process all codes and make table entries */
        for (;;) {
            i++;
            /* create table entry */
            here_bits = len - drop;
            if (work[sym] < end) {
                here_op = 0;
                here_val = work[sym];
            }
            else if (work[sym] > end) {
                here_op = extra[extra_index + work[sym]];
                here_val = base[base_index + work[sym]];
            }
            else {
                here_op = 32 + 64;         /* end of block */
                here_val = 0;
            }

            /* replicate for those indices with low len bits equal to huff */
            incr = 1 << (len - drop);
            fill = 1 << curr;
            min = fill;                 /* save offset to next table */
            do {
                fill -= incr;
                table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
            } while (fill !== 0);

            /* backwards increment the len-bit code huff */
            incr = 1 << (len - 1);
            while (huff & incr) {
                incr >>= 1;
            }
            if (incr !== 0) {
                huff &= incr - 1;
                huff += incr;
            } else {
                huff = 0;
            }

            /* go to next symbol, update count, len */
            sym++;
            if (--count[len] === 0) {
                if (len === max) { break; }
                len = lens[lens_index + work[sym]];
            }

            /* create new sub-table if needed */
            if (len > root && (huff & mask) !== low) {
                /* if first time, transition to sub-tables */
                if (drop === 0) {
                    drop = root;
                }

                /* increment past last table */
                next += min;            /* here min is 1 << curr */

                /* determine length of next table */
                curr = len - drop;
                left = 1 << curr;
                while (curr + drop < max) {
                    left -= count[curr + drop];
                    if (left <= 0) { break; }
                    curr++;
                    left <<= 1;
                }

                /* check for enough space */
                used += 1 << curr;
                if ((type === LENS && used > ENOUGH_LENS) ||
                    (type === DISTS && used > ENOUGH_DISTS)) {
                    return 1;
                }

                /* point entry in root table to sub-table */
                low = huff & mask;
                /*table.op[low] = curr;
                 table.bits[low] = root;
                 table.val[low] = next - opts.table_index;*/
                table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
            }
        }

        /* fill in remaining table entry if code is incomplete (guaranteed to have
         at most one remaining entry, since if the code is incomplete, the
         maximum code length that was allowed to get this far is one bit) */
        if (huff !== 0) {
            //table.op[next + huff] = 64;            /* invalid code marker */
            //table.bits[next + huff] = len - drop;
            //table.val[next + huff] = 0;
            table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
        }

        /* set return parameters */
        //opts.table_index += used;
        opts.bits = root;
        return 0;
    };

},{"../utils/common":1}],10:[function(require,module,exports){
    'use strict';

    module.exports = {
        '2':    'need dictionary',     /* Z_NEED_DICT       2  */
        '1':    'stream end',          /* Z_STREAM_END      1  */
        '0':    '',                    /* Z_OK              0  */
        '-1':   'file error',          /* Z_ERRNO         (-1) */
        '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
        '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
        '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
        '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
        '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
    };

},{}],11:[function(require,module,exports){
    'use strict';


    function ZStream() {
        /* next input byte */
        this.input = null; // JS specific, because we have no pointers
        this.next_in = 0;
        /* number of bytes available at input */
        this.avail_in = 0;
        /* total number of input bytes read so far */
        this.total_in = 0;
        /* next output byte should be put there */
        this.output = null; // JS specific, because we have no pointers
        this.next_out = 0;
        /* remaining free space at output */
        this.avail_out = 0;
        /* total number of bytes output so far */
        this.total_out = 0;
        /* last error message, NULL if no error */
        this.msg = ''/*Z_NULL*/;
        /* not visible by applications */
        this.state = null;
        /* best guess about the data type: binary or text */
        this.data_type = 2/*Z_UNKNOWN*/;
        /* adler32 value of the uncompressed data */
        this.adler = 0;
    }

    module.exports = ZStream;

},{}],"/lib/inflate.js":[function(require,module,exports){
    'use strict';


    var zlib_inflate = require('./zlib/inflate.js');
    var utils = require('./utils/common');
    var strings = require('./utils/strings');
    var c = require('./zlib/constants');
    var msg = require('./zlib/messages');
    var zstream = require('./zlib/zstream');
    var gzheader = require('./zlib/gzheader');

    var toString = Object.prototype.toString;

    /**
     * class Inflate
     *
     * Generic JS-style wrapper for zlib calls. If you don't need
     * streaming behaviour - use more simple functions: [[inflate]]
     * and [[inflateRaw]].
     **/

    /* internal
     * inflate.chunks -> Array
     *
     * Chunks of output data, if [[Inflate#onData]] not overriden.
     **/

    /**
     * Inflate.result -> Uint8Array|Array|String
     *
     * Uncompressed result, generated by default [[Inflate#onData]]
     * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
     * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
     * push a chunk with explicit flush (call [[Inflate#push]] with
     * `Z_SYNC_FLUSH` param).
     **/

    /**
     * Inflate.err -> Number
     *
     * Error code after inflate finished. 0 (Z_OK) on success.
     * Should be checked if broken data possible.
     **/

    /**
     * Inflate.msg -> String
     *
     * Error message, if [[Inflate.err]] != 0
     **/


    /**
     * new Inflate(options)
     * - options (Object): zlib inflate options.
     *
     * Creates new inflator instance with specified params. Throws exception
     * on bad params. Supported options:
     *
     * - `windowBits`
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Additional options, for internal needs:
     *
     * - `chunkSize` - size of generated data chunks (16K by default)
     * - `raw` (Boolean) - do raw inflate
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     * By default, when no options set, autodetect deflate/gzip data format via
     * wrapper header.
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
     *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
     *
     * var inflate = new pako.Inflate({ level: 3});
     *
     * inflate.push(chunk1, false);
     * inflate.push(chunk2, true);  // true -> last chunk
     *
     * if (inflate.err) { throw new Error(inflate.err); }
     *
     * console.log(inflate.result);
     * ```
     **/
    var Inflate = function(options) {

        this.options = utils.assign({
            chunkSize: 16384,
            windowBits: 0,
            to: ''
        }, options || {});

        var opt = this.options;

        // Force window size for `raw` data, if not set directly,
        // because we have no header for autodetect.
        if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
            opt.windowBits = -opt.windowBits;
            if (opt.windowBits === 0) { opt.windowBits = -15; }
        }

        // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
        if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
            !(options && options.windowBits)) {
            opt.windowBits += 32;
        }

        // Gzip header has no info about windows size, we can do autodetect only
        // for deflate. So, if window size not set, force it to max when gzip possible
        if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
            // bit 3 (16) -> gzipped data
            // bit 4 (32) -> autodetect gzip/deflate
            if ((opt.windowBits & 15) === 0) {
                opt.windowBits |= 15;
            }
        }

        this.err    = 0;      // error code, if happens (0 = Z_OK)
        this.msg    = '';     // error message
        this.ended  = false;  // used to avoid multiple onEnd() calls
        this.chunks = [];     // chunks of compressed data

        this.strm   = new zstream();
        this.strm.avail_out = 0;

        var status  = zlib_inflate.inflateInit2(
            this.strm,
            opt.windowBits
        );

        if (status !== c.Z_OK) {
            throw new Error(msg[status]);
        }

        this.header = new gzheader();

        zlib_inflate.inflateGetHeader(this.strm, this.header);
    };

    /**
     * Inflate#push(data[, mode]) -> Boolean
     * - data (Uint8Array|Array|ArrayBuffer|String): input data
     * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
     *
     * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
     * new output chunks. Returns `true` on success. The last data block must have
     * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
     * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
     * can use mode Z_SYNC_FLUSH, keeping the decompression context.
     *
     * On fail call [[Inflate#onEnd]] with error code and return false.
     *
     * We strongly recommend to use `Uint8Array` on input for best speed (output
     * format is detected automatically). Also, don't skip last param and always
     * use the same type in your code (boolean or number). That will improve JS speed.
     *
     * For regular `Array`-s make sure all elements are [0..255].
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     **/
    Inflate.prototype.push = function(data, mode) {
        var strm = this.strm;
        var chunkSize = this.options.chunkSize;
        var status, _mode;
        var next_out_utf8, tail, utf8str;

        // Flag to properly process Z_BUF_ERROR on testing inflate call
        // when we check that all output data was flushed.
        var allowBufError = false;

        if (this.ended) { return false; }
        _mode = (mode === ~~mode) ? mode : ((mode === true) ? c.Z_FINISH : c.Z_NO_FLUSH);

        // Convert data if needed
        if (typeof data === 'string') {
            // Only binary strings can be decompressed on practice
            strm.input = strings.binstring2buf(data);
        } else if (toString.call(data) === '[object ArrayBuffer]') {
            strm.input = new Uint8Array(data);
        } else {
            strm.input = data;
        }

        strm.next_in = 0;
        strm.avail_in = strm.input.length;

        do {
            if (strm.avail_out === 0) {
                strm.output = new utils.Buf8(chunkSize);
                strm.next_out = 0;
                strm.avail_out = chunkSize;
            }

            status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    /* no bad return value */

            if (status === c.Z_BUF_ERROR && allowBufError === true) {
                status = c.Z_OK;
                allowBufError = false;
            }

            if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
                this.onEnd(status);
                this.ended = true;
                return false;
            }

            if (strm.next_out) {
                if (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH))) {

                    if (this.options.to === 'string') {

                        next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

                        tail = strm.next_out - next_out_utf8;
                        utf8str = strings.buf2string(strm.output, next_out_utf8);

                        // move tail
                        strm.next_out = tail;
                        strm.avail_out = chunkSize - tail;
                        if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

                        this.onData(utf8str);

                    } else {
                        this.onData(utils.shrinkBuf(strm.output, strm.next_out));
                    }
                }
            }

            // When no more input data, we should check that internal inflate buffers
            // are flushed. The only way to do it when avail_out = 0 - run one more
            // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
            // Here we set flag to process this error properly.
            //
            // NOTE. Deflate does not return error in this case and does not needs such
            // logic.
            if (strm.avail_in === 0 && strm.avail_out === 0) {
                allowBufError = true;
            }

        } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);

        if (status === c.Z_STREAM_END) {
            _mode = c.Z_FINISH;
        }

        // Finalize on the last chunk.
        if (_mode === c.Z_FINISH) {
            status = zlib_inflate.inflateEnd(this.strm);
            this.onEnd(status);
            this.ended = true;
            return status === c.Z_OK;
        }

        // callback interim results if Z_SYNC_FLUSH.
        if (_mode === c.Z_SYNC_FLUSH) {
            this.onEnd(c.Z_OK);
            strm.avail_out = 0;
            return true;
        }

        return true;
    };


    /**
     * Inflate#onData(chunk) -> Void
     * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
     *   on js engine support. When string output requested, each chunk
     *   will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    Inflate.prototype.onData = function(chunk) {
        this.chunks.push(chunk);
    };


    /**
     * Inflate#onEnd(status) -> Void
     * - status (Number): inflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called either after you tell inflate that the input stream is
     * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
     * or if an error happened. By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    Inflate.prototype.onEnd = function(status) {
        // On success - join
        if (status === c.Z_OK) {
            if (this.options.to === 'string') {
                // Glue & convert here, until we teach pako to send
                // utf8 alligned strings to onData
                this.result = this.chunks.join('');
            } else {
                this.result = utils.flattenChunks(this.chunks);
            }
        }
        this.chunks = [];
        this.err = status;
        this.msg = this.strm.msg;
    };


    /**
     * inflate(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Decompress `data` with inflate/ungzip and `options`. Autodetect
     * format via wrapper header by default. That's why we don't provide
     * separate `ungzip` method.
     *
     * Supported options are:
     *
     * - windowBits
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information.
     *
     * Sugar (options):
     *
     * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
     *   negative windowBits implicitly.
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
     *   , output;
     *
     * try {
 *   output = pako.inflate(input);
 * } catch (err)
     *   console.log(err);
     * }
     * ```
     **/
    function inflate(input, options) {
        var inflator = new Inflate(options);

        inflator.push(input, true);

        // That will never happens, if you don't cheat with options :)
        if (inflator.err) { throw inflator.msg; }

        return inflator.result;
    }


    /**
     * inflateRaw(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * The same as [[inflate]], but creates raw data, without wrapper
     * (header and adler32 crc).
     **/
    function inflateRaw(input, options) {
        options = options || {};
        options.raw = true;
        return inflate(input, options);
    }


    /**
     * ungzip(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Just shortcut to [[inflate]], because it autodetects format
     * by header.content. Done for convenience.
     **/


    exports.Inflate = Inflate;
    exports.inflate = inflate;
    exports.inflateRaw = inflateRaw;
    exports.ungzip  = inflate;

},{"./utils/common":1,"./utils/strings":2,"./zlib/constants":4,"./zlib/gzheader":6,"./zlib/inflate.js":8,"./zlib/messages":10,"./zlib/zstream":11}]},{},[])("/lib/inflate.js")
});
HX.FbxObject = function()
{
    this.name = null;
    this.UID = null;
    this.parent = null; // only used if parent is FbxNode

    // can be use for marking during parsing
    this.data = null;
};

HX.FbxObject.prototype =
{
    connectObject: function(obj)
    {
        throw new Error("Unhandled object connection " + obj.toString() + " -> " + this.toString());
    },

    connectProperty: function(obj, propertyName)
    {

    },

    copyProperties: function(template)
    {
        for (var key in template) {
            // do not copy anything that's not defined
            if (this.hasOwnProperty(key) && template[key] !== undefined && template[key] !== null) {
                // very dirty, but saves so much space
                // FBX native properties are uppercase, ours aren't. There you have it.
                var char = key.charAt(0);
                if (char.toUpperCase() === char)
                    this[key] = template[key];
            }
        }
    }
};

HX.FbxObject.prototype.toString = function() { return "[FbxObject(name="+this.name+")]"; };
HX.FbxNode = function()
{
    HX.FbxObject.call(this);
    this.RotationOffset = null;
    this.RotationPivot = null;
    this.ScalingOffset = null;
    this.ScalingPivot = null;
    this.RotationOrder = 0;
    this.PreRotation = null;
    this.PostRotation = null;
    this.InheritType = 0;
    this.GeometricTranslation = null;
    this.GeometricRotation = null;
    this.GeometricScaling = null;
    this["Lcl Translation"] = null;
    this["Lcl Rotation"] = null;
    this["Lcl Scaling"] = null;
    this.Visibility = true;

    this.type = null;
    this.children = null;
    this.skeleton = null;
    this.defaultAttribute = null;
    this.attributes = null;
    this.mesh = null;
    this.materials = null;
    this.animationCurveNodes = null;

    this._geometricMatrix = null;
    this._matrix = null;
};

HX.FbxNode.prototype = Object.create(HX.FbxObject.prototype,
    {
        numChildren:
        {
            get: function ()
            {
                return this.children? this.children.length : 0;
            }
        },

        geometryTransform:
        {
            get: function()
            {
                if (!this._geometricMatrix) {
                    this._geometricMatrix = new HX.Matrix4x4();
                    if (this.GeometricRotation || this.GeometricScaling || this.GeometricTranslation) {
                        var transform = new HX.Transform();
                        // for now there will be problems with this if several geometric transformations are used on the same geometry
                        if (this.GeometricRotation) {
                            var quat = new HX.Quaternion();
                            quat.fromEuler(this.GeometricRotation.x * HX.DEG_TO_RAD, this.GeometricRotation.y * HX.DEG_TO_RAD, this.GeometricRotation.z * HX.DEG_TO_RAD);
                            transform.rotation = quat;
                        }
                        if (this.GeometricScaling) transform.scale = this.GeometricScaling;
                        if (this.GeometricTranslation) transform.position = this.GeometricTranslation;
                        this._geometricMatrix.copyFrom(transform.transformationMatrix);
                    }
                }

                return this._geometricMatrix;
            }
        },

        matrix:
        {
            get: function()
            {
                if (!this._matrix) {
                    this._matrix = new HX.Matrix4x4();
                    var matrix = this._matrix;
                    if (this.ScalingPivot) matrix.appendTranslation(HX.Float4.negate(this.ScalingPivot));
                    var scale = this["Lcl Scaling"];
                    if (scale) matrix.appendScale(scale.x, scale.y, scale.z);
                    if (this.ScalingPivot) matrix.appendTranslation(this.ScalingPivot);
                    if (this.ScalingOffset) matrix.appendTranslation(this.ScalingOffset);

                    if (this.RotationPivot) matrix.appendTranslation(HX.Float4.negate(this.RotationPivot));
                    if (this.PreRotation) matrix.appendQuaternion(this._convertRotation(this.PreRotation));
                    if (this["Lcl Rotation"]) matrix.appendQuaternion(this._convertRotation(this["Lcl Rotation"]));
                    if (this.PostRotation) matrix.appendQuaternion(this._convertRotation(this.PostRotation));
                    if (this.RotationPivot) matrix.appendTranslation(this.RotationPivot);
                    if (this.RotationOffset) matrix.appendTranslation(this.RotationOffset);

                    if (this["Lcl Translation"]) matrix.appendTranslation(this["Lcl Translation"]);
                }

                return this._matrix;
            }
        }
    }
);

HX.FbxNode.prototype.getChild = function(i)
{
    return this.children[i];
};

HX.FbxNode.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxNode) {
        //if (obj.type === "Null") return;

        if (obj.type === "Root") {
            this.skeleton = obj;
        }
        else {
            this.children = this.children || [];
            this.children.push(obj);
            obj.parent = this;
        }
    }
    else if (obj instanceof HX.FbxNodeAttribute) {
        this.defaultAttribute = this.defaultAttribute || obj;
        this.attributes = this.attributes || [];
        this.attributes.push(obj);
    }
    else if (obj instanceof HX.FbxMesh) {
        this.mesh = obj;
        this.mesh.parent = this;
    }
    else if (obj instanceof HX.FbxMaterial) {
        this.materials = this.materials || [];
        this.materials.push(obj);
    }
    else if (obj instanceof HX.FbxTrashNode) {
        // silently ignore it
    }
    else {
        throw new Error("Incompatible child object " + obj.toString() + " for " + this.type);
    }
};

HX.FbxNode.prototype._convertRotation = function(v)
{
    var quat = new HX.Quaternion();
    quat.fromEuler(v.x * HX.DEG_TO_RAD, v.y * HX.DEG_TO_RAD, v.z * HX.DEG_TO_RAD);
    return quat;
};

HX.FbxNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxAnimationCurveNode) {
        this.animationCurveNodes = this.animationCurveNodes || {};
        this.animationCurveNodes[propertyName] = obj;
        obj.propertyName = propertyName;
    }
};

HX.FbxNode.prototype.toString = function() { return "[FbxNode(name="+this.name+", type="+this.type+")]"; };
HX.MD5Anim = function()
{
    HX.Importer.call(this, HX.SkeletonClip);
    this._hierarchy = null;
    this._baseFrame = null;
    this._activeFrame = null;
    this._numJoints = 0;

    this._correctionQuad = new HX.Quaternion();
    this._correctionQuad.fromAxisAngle(HX.Float4.X_AXIS, -Math.PI *.5);
};

HX.MD5Anim.prototype = Object.create(HX.Importer.prototype);

HX.MD5Anim.prototype.parse = function(data, target)
{
    this._hierarchy = [];
    this._baseFrame = [];
    this._target = target;

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numFrames":
            case "MD5Version":
            case "numAnimatedComponents":
                break;
            case "numJoints":
                this._numJoints = parseInt(tokens[1]);
                break;
            case "frameRate":
                target.frameRate = parseInt(tokens[1]);
                break;
            case "hierarchy":
                lineFunction = this._parseHierarchy;
                break;
            case "bounds":
                lineFunction = this._parseBounds;
                break;
            case "baseframe":
                lineFunction = this._parseBaseFrame;
                break;
            case "frame":
                this._activeFrame = new HX.MD5Anim._FrameData();
                lineFunction = this._parseFrame;
                break;

        }
    }

    this._notifyComplete(target);
};

HX.MD5Anim.prototype._parseHierarchy = function(tokens)
{
    if (tokens[0] === "}") return;
    var data = new HX.MD5Anim._HierachyData();
    data.name = tokens[0].substring(1, tokens[0].length - 1);
    data.parent = parseInt(tokens[1]);
    data.flags = parseInt(tokens[2]);
    data.startIndex = parseInt(tokens[3]);
    this._hierarchy.push(data);
};

HX.MD5Anim.prototype._parseBounds = function(tokens)
{
    // don't do anything with bounds for now
};

HX.MD5Anim.prototype._parseBaseFrame = function(tokens)
{
    if (tokens[0] === "}") return;
    var baseFrame = new HX.MD5Anim._BaseFrameData();
    var pos = baseFrame.pos;
    pos.x = parseFloat(tokens[1]);
    pos.y = parseFloat(tokens[2]);
    pos.z = parseFloat(tokens[3]);
    var quat = baseFrame.quat;
    quat.x = parseFloat(tokens[6]);
    quat.y = parseFloat(tokens[7]);
    quat.z = parseFloat(tokens[8]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);
    this._baseFrame.push(baseFrame);
};

HX.MD5Anim.prototype._parseFrame = function(tokens)
{
    if (tokens[0] === "}") {
        this._translateFrame();
        return;
    }

    var len = tokens.length;
    for (var i = 0; i < len; ++i) {
        this._activeFrame.components.push(parseFloat(tokens[i]));
    }
};

HX.MD5Anim.prototype._translateFrame = function()
{
    var skeletonPose = new HX.SkeletonPose();

    for (var i = 0; i < this._numJoints; ++i) {
        var pose = new HX.SkeletonJointPose();
        var hierarchy = this._hierarchy[i];
        var base = this._baseFrame[i];
        var flags = hierarchy.flags;
        var pos = base.pos;
        var quat = base.quat;
        var comps = this._activeFrame.components;

        var j = hierarchy.startIndex;

        if (flags & 1) pos.x = comps[j];
        if (flags & 2) pos.y = comps[j+1];
        if (flags & 4) pos.z = comps[j+2];
        if (flags & 8) quat.x = comps[j+3];
        if (flags & 16) quat.y = comps[j+4];
        if (flags & 32) quat.z = comps[j+5];

        var w = 1.0 - quat.x * quat.x - quat.y * quat.y - quat.z * quat.z;
        quat.w = w < 0.0 ? 0.0 : -Math.sqrt(w);

        // transform root joints only
        if (hierarchy.parent < 0) {
            pose.rotation.multiply(this._correctionQuad, quat);
            pose.position = this._correctionQuad.rotate(pos);
        }
        else {
            pose.rotation.copyFrom(quat);
            pose.position.copyFrom(pos);
        }

        skeletonPose.jointPoses.push(pose);
    }

    this._target.addFrame(skeletonPose);
};

HX.MD5Anim._HierachyData = function()
{
    this.name = null;
    this.parent = -1;
    this.flags = 0;
    this.startIndex = 0;
};

HX.MD5Anim._BaseFrameData = function()
{
    this.pos = new HX.Float4();
    this.quat = new HX.Quaternion();
};

HX.MD5Anim._FrameData = function()
{
    this.components = [];
}
/**
 * Warning, MD5 as supported by Helix does not contain any materials nor scene graph information, so it only loads Models, not instances!
 * @constructor
 */
HX.MD5Mesh = function()
{
    HX.Importer.call(this, HX.Model);
    this._target = null;
    this._meshData = null;
    this._jointData = null;
    this._skeleton = null;

    this._correctionQuad = new HX.Quaternion();
    this._correctionQuad.fromAxisAngle(HX.Float4.X_AXIS, -Math.PI *.5);
};

HX.MD5Mesh.prototype = Object.create(HX.Importer.prototype);

HX.MD5Mesh.prototype.parse = function(data, target)
{
    this._modelData = new HX.ModelData();
    this._skeleton = new HX.Skeleton();
    this._jointData = [];

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numMeshes":
            case "numJoints":
            case "MD5Version":
                break;
            case "joints":
                lineFunction = this._parseJoint;
                break;
            case "mesh":
                this._meshData = new HX.MD5Mesh._MeshData();
                lineFunction = this._parseMesh;
                break;
        }
    }

    target._setModelData(this._modelData);
    target.skeleton = this._skeleton;
    this._notifyComplete(target);
};

HX.MD5Mesh.prototype._parseJoint = function(tokens)
{
    if (tokens[0] === "}") return;

    var jointData = new HX.MD5Mesh._Joint();
    var pos = jointData.pos;
    var quat = jointData.quat;
    jointData.name = tokens[0].substring(1, tokens[0].length - 1);

    jointData.parentIndex = parseInt(tokens[1]);

    pos.x = parseFloat(tokens[3]);
    pos.y = parseFloat(tokens[4]);
    pos.z = parseFloat(tokens[5]);
    this._correctionQuad.rotate(jointData.pos, jointData.pos);
    quat.x = parseFloat(tokens[8]);
    quat.y = parseFloat(tokens[9]);
    quat.z = parseFloat(tokens[10]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);

    quat.multiply(this._correctionQuad, quat);
    this._jointData.push(jointData);

    var joint = new HX.SkeletonJoint();
    joint.inverseBindPose.fromQuaternion(quat);
    var pos = jointData.pos;
    joint.inverseBindPose.appendTranslation(pos);
    joint.inverseBindPose.invertAffine();
    joint.parentIndex = jointData.parentIndex;
    this._skeleton.addJoint(joint);
};

HX.MD5Mesh.prototype._parseMesh = function(tokens)
{
    switch (tokens[0]) {
        case "shader":
        case "numVerts":
        case "numWeights":
            break;
        case "tri":
            this._meshData.indices.push(parseInt(tokens[2]), parseInt(tokens[4]), parseInt(tokens[3]));
            break;
        case "vert":
            this._parseVert(tokens);
            break;
        case "weight":
            this._parseWeight(tokens);
            break;
        case "}":
            this._translateMesh();
            break;
    }
};

HX.MD5Mesh.prototype._parseVert = function(tokens)
{
    var vert = new HX.MD5Mesh._VertexData();
    vert.u = parseFloat(tokens[3]);
    vert.v = parseFloat(tokens[4]);
    vert.startWeight = parseInt(tokens[6]);
    vert.countWeight = parseInt(tokens[7]);
    this._meshData.vertexData.push(vert);
};

HX.MD5Mesh.prototype._parseWeight = function(tokens)
{
    var weight = new HX.MD5Mesh._WeightData();
    weight.joint = parseInt(tokens[2]);
    weight.bias = parseFloat(tokens[3]);
    weight.pos.x = parseFloat(tokens[5]);
    weight.pos.y = parseFloat(tokens[6]);
    weight.pos.z = parseFloat(tokens[7]);
    this._meshData.weightData.push(weight);
};

HX.MD5Mesh.prototype._translateMesh = function()
{
    var meshData = new HX.MeshData.createDefaultEmpty();
    meshData.addVertexAttribute("hx_boneIndices", 4, 1);
    meshData.addVertexAttribute("hx_boneWeights", 4, 1);
    var vertices = [];
    var anims = [];

    var vertexData = this._meshData.vertexData;
    var len = vertexData.length;
    var v = 0, a = 0;
    var x, y, z;

    for (var i = 0; i < len; ++i) {
        var vertData = vertexData[i];
        x = y = z = 0;

        if (vertData.countWeight > 4)
            console.warn("Warning: more than 4 weights assigned. Mesh will not animate correctly");

        for (var w = 0; w < vertData.countWeight; ++w) {
            var weightData = this._meshData.weightData[vertData.startWeight + w];
            var joint = this._jointData[weightData.joint];
            var vec = joint.quat.rotate(weightData.pos);
            var pos = joint.pos;
            var bias = weightData.bias;
            x += (vec.x + pos.x) * bias;
            y += (vec.y + pos.y) * bias;
            z += (vec.z + pos.z) * bias;
            // cap at 4 and hope nothing blows up
            if (w < 4) {
                anims[a + w] = weightData.joint;
                anims[a + 4 + w] = weightData.bias;
            }
        }

        vertices[v] = x;
        vertices[v + 1] = y;
        vertices[v + 2] = z;
        vertices[v + 10] = vertData.u;
        vertices[v + 11] = 1.0 - vertData.v;

        for (var w = vertData.countWeight; w < 4; ++w) {
            anims[a + w] = 0;
            anims[a + 4 + w] = 0;
        }

        a += 8;
        v += 12;
    }

    meshData.setVertexData(vertices, 0);
    meshData.setVertexData(anims, 1);
    meshData.setIndexData(this._meshData.indices);

    var generator = new HX.NormalTangentGenerator();
    generator.generate(meshData);
    this._modelData.addMeshData(meshData);
};

HX.MD5Mesh._Joint = function()
{
    this.name = null;
    this.parentIndex = -1;
    this.quat = new HX.Quaternion();
    this.pos = new HX.Float4();
};

HX.MD5Mesh._MeshData = function()
{
    this.vertexData = [];
    this.weightData = [];
    this.indices = [];
};

HX.MD5Mesh._VertexData = function()
{
    this.u = 0;
    this.v = 0;
    this.startWeight = 0;
    this.countWeight = 0;
};

HX.MD5Mesh._WeightData = function()
{
    this.joint = 0;
    this.bias = 0;
    this.pos = new HX.Float4();
};
/**
 *
 * @constructor
 */
HX.FBX = function()
{
    HX.Importer.call(this, HX.GroupNode, HX.Importer.TYPE_BINARY);
    this._rootNode = null;
};

HX.FBX.prototype = Object.create(HX.Importer.prototype);

HX.FBX.prototype.parse = function(data, target)
{
    var stream = new HX.DataStream(data);

    var deserializer = new HX.FBXBinaryDeserializer();
    var fbxGraphBuilder = new HX.FBXGraphBuilder();
    var fbxSceneConverter = new HX.FBXConverter();
    var settings = new HX.FBXSettings();

    try {
        var newTime, time = Date.now();

        var record = deserializer.deserialize(stream);

        newTime = Date.now();
        console.log("Serialization: " + (newTime - time));
        time = newTime;

        settings.init(record);

        if (deserializer.version < 7000) throw new Error("Unsupported FBX version!");
        fbxGraphBuilder.build(record, settings);

        newTime = Date.now();
        console.log("Graph building: " + (newTime - time));
        time = newTime;

        fbxSceneConverter.convert(fbxGraphBuilder.sceneRoot, fbxGraphBuilder.animationStack, target, settings);

        newTime = Date.now();
        console.log("Conversion: " + (newTime - time));
    }
    catch(err) {
        console.log(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    if (fbxSceneConverter.textureTokens.length > 0) {
        this._loadTextures(fbxSceneConverter.textureTokens, fbxSceneConverter.textureMaterialMap, target);
    }
    else
        this._notifyComplete(target);
};

HX.FBX.prototype._loadTextures = function(tokens, map, target)
{
    var files = [];
    var numTextures = tokens.length;

    for (var i = 0; i < numTextures; ++i) {
        var token = tokens[i];
        token.filename = files[i] = this._correctURL(token.filename);
    }

    var self = this;
    var bulkLoader = new HX.BulkAssetLoader();
    bulkLoader.onFail = function(message)
    {
        self._notifyFailure(message);
    };

    bulkLoader.onComplete = function()
    {
        var numMappings = map.length;
        for (var i = 0; i < numMappings; ++i) {
            var mapping = map[i];
            var token = mapping.token;
            var texture = bulkLoader.getAsset(token.filename);
            texture.name = token.name;

            switch (mapping.mapType) {
                case HX.FBXConverter._TextureToken.NORMAL_MAP:
                    mapping.material.normalMap = texture;
                    break;
                case HX.FBXConverter._TextureToken.SPECULAR_MAP:
                    mapping.material.specularMap = texture;
                    break;
                case HX.FBXConverter._TextureToken.DIFFUSE_MAP:
                    mapping.material.colorMap = texture;
                    break;
            }
        }
        self._notifyComplete(target);
    };

    bulkLoader.load(files, HX.JPG);
};
// Could also create an ASCII deserializer
HX.FBXAnimationConverter = function()
{
    this._skinningData = null;
    this._jointUIDLookUp = null;
    this._skeleton = null;
    this._fakeJointIndex = -1;
    this._animationClips = null;
    this._frameRate = 24;
};

HX.FBXAnimationConverter.prototype =
{
    get skeleton()
    {
        return this._skeleton;
    },

    get animationClips()
    {
        return this._animationClips;
    },

    get fakeJointIndex()
    {
        return this._fakeJointIndex;
    },

    getJointBinding: function(ctrlPointIndex)
    {
        return this._skinningData[ctrlPointIndex];
    },

    convertSkin: function (fbxSkin, geometryMatrix)
    {
        this._skeleton = new HX.Skeleton();
        // skinning data contains a list of bindings per control point
        this._skinningData = [];
        this._jointUIDLookUp = {};

        var len = fbxSkin.clusters.length;

        for (var i = 0; i < len; ++i) {
            var cluster = fbxSkin.clusters[i];
            // a bit annoying, but this way, if there's multiple roots (by whatever chance), we cover them all
            this._addJointsToSkeleton(this._getRootNodeForCluster(cluster));
            var jointData = this._jointUIDLookUp[cluster.limbNode.UID];
            this._assignInverseBindPose(cluster, geometryMatrix, jointData.joint);
            this._assignJointBinding(cluster, jointData.index);
        }

        var fakeJoint = new HX.SkeletonJoint();
        this._fakeJointIndex = this._skeleton.numJoints;
        this._skeleton.addJoint(fakeJoint);

        // are joint poses local perhaps?
        /*for (var i = this._skeleton.numJoints - 1; i >= 0; --i) {
            var joint = this._skeleton.getJoint(i);

            if (joint.parentIndex >= 0) {
                var parent = this._skeleton.getJoint(joint.parentIndex);
                joint.inverseBindPose.prepend(parent.inverseBindPose);
            }
        }*/

        for (var key in this._jointUIDLookUp) {
            this._jointUIDLookUp[key].fbxNode.data = null;
        }
    },

    convertClips: function(fbxAnimationStack, fbxMesh, geometryMatrix, settings)
    {
        this._frameRate = settings.frameRate;

        this._animationClips = [];

        // TODO: If multiple takes are supported, these would need to be separate clips as well
        for (var i = 0; i < fbxAnimationStack.layers.length; ++i) {
            var numFrames = fbxAnimationStack.LocalStop.getFrameCount(this._frameRate) - fbxAnimationStack.LocalStart.getFrameCount(this._frameRate) + 1;
            var layers = fbxAnimationStack.layers;
            for (var j = 0; j < layers.length; ++j) {
                var clip = this._convertLayer(layers[j], numFrames);
                this._animationClips.push(clip);
            }
        }
    },

    _addJointsToSkeleton: function(rootNode)
    {
        // already added to the skeleton
        if (rootNode.data === true) return;
        rootNode.data = true;
        this._convertSkeletonNode(rootNode, -1);
    },

    _convertSkeletonNode: function(fbxNode, parentIndex)
    {
        var joint = new HX.SkeletonJoint();
        joint.parentIndex = parentIndex;

        var index = this._skeleton.numJoints;
        this._skeleton.addJoint(joint);

        this._jointUIDLookUp[fbxNode.UID] = { joint: joint, index: index, fbxNode: fbxNode };

        if (fbxNode.animationCurveNodes) {
            for (var key in fbxNode.animationCurveNodes) {
                if (fbxNode.animationCurveNodes.hasOwnProperty(key)) {
                    var node = fbxNode.animationCurveNodes[key];
                    // store the joint index as curve node data
                    node.data = index;
                }
            }
        }

        for (var i = 0; i < fbxNode.numChildren; ++i) {
            this._convertSkeletonNode(fbxNode.getChild(i), index);
        }
    },

    _assignJointBinding: function(cluster, jointIndex)
    {
        if (!cluster.indices) return;
        var len = cluster.indices.length;

        for (var i = 0; i < len; ++i) {
            if (cluster.weights[i] > 0) {
                var ctrlPointIndex = cluster.indices[i];
                var skinningData = this._skinningData[ctrlPointIndex] = this._skinningData[ctrlPointIndex] || [];
                var binding = new HX.FBXModelInstanceConverter._JointBinding();
                binding.jointIndex = jointIndex;
                binding.jointWeight = cluster.weights[i];
                skinningData.push(binding);
            }
        }
    },

    _assignInverseBindPose: function (cluster, geometryMatrix, joint)
    {
        // looks like Unreal uses this, along with cluster's limbnode transform to deform vertices?
        // in that case, should be able to apply this to bind pose instead, since it boils down to the same thing?
        joint.inverseBindPose.copyFrom(cluster.transformLink);
        joint.inverseBindPose.invertAffine();
        joint.inverseBindPose.prependAffine(cluster.transform);
        joint.inverseBindPose.prependAffine(geometryMatrix);
        //joint.inverseBindPose.append(this._settings.orientationMatrix);
    },

    _getLimbGlobalMatrix: function(node)
    {
        if (!node._globalMatrix) {
            node._globalMatrix = new HX.Matrix4x4();
            if (node.parent && node.parent.type === "LimbNode") {
                var parentMatrix = this._getLimbGlobalMatrix(node.parent);
                node._globalMatrix.multiply(parentMatrix, node.matrix);
            }
            else {
                node._globalMatrix.copyFrom(node.matrix);
            }
        }
        return node._globalMatrix;
    },

    // this uses the logic that one of the clusters is bound to have the root node assigned to them
    // not sure if this is always the case, however
    _getRootNodeForCluster: function(cluster)
    {
        var limbNode = cluster.limbNode;
        while (limbNode) {
            if (limbNode.type !== "LimbNode")
                return limbNode;
            limbNode = limbNode.parent;
        }
        throw new Error("No Root node found!");
    },

    _convertLayer: function (layer, numFrames)
    {
        // TODO: make framerate an overridable option

        var clip = new HX.SkeletonClip();
        clip.frameRate = this._frameRate;

        // convert key frames to sized frames
        this._convertToFrames(layer, numFrames);

        for (var i = 0; i < numFrames; ++i)
            clip.addFrame(this._convertFrame(layer, i));

        return clip;
    },

    _convertToFrames: function(layer, numFrames)
    {
        var numCurveNodes = layer.curveNodes.length;
        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            // the order of parsing is inefficient
            // need to break up curves first into keyframes, then assign them
            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var curve = node.curves[key];
                this._convertCurveToFrames(curve, numFrames);
            }
        }
    },

    _convertCurveToFrames: function(curve, numFrames)
    {
        var time = 0.0;
        var j = 0;
        // ms per frame
        var frameDuration = 1000.0 / this._frameRate;
        var numKeyFrames = curve.KeyTime.length;
        var frameData = [];

        for (var i = 0; i < numFrames; ++i) {
            time += frameDuration;
            while (j < numKeyFrames && curve.KeyTime[j].milliseconds < time) {
                ++j;
            }

            // clamp to extremes (shouldn't happen, I think?)
            if (j === 0)
                frameData.push(curve.KeyValueFloat[j]);
            else if (j === numKeyFrames)
                frameData.push(curve.KeyValueFloat[j - 1]);
            else {
                // this should take into account tangents, if present
                var keyTime = curve.KeyTime[j].milliseconds;
                var prevTime = curve.KeyTime[j - 1].milliseconds;
                var t = (time - prevTime) / (keyTime - prevTime);
                var next = curve.KeyValueFloat[j];
                var prev = curve.KeyValueFloat[j - 1];
                frameData.push(prev + (next - prev) * t);
            }
        }
        curve.data = frameData;
    },

    _convertFrame: function(layer, frame)
    {
        var skeletonPose = new HX.SkeletonPose();
        var numJoints = this._skeleton.numJoints;

        var numCurveNodes = layer.curveNodes.length;
        var tempJointPoses = [];

        // use local bind pose as default
        for (var i = 0; i < numJoints; ++i) {
            var joint = this._skeleton.getJoint(i);
            var localBind = joint.inverseBindPose.clone();
            localBind.invertAffine();

            // by default, use bind pose
            if (joint.parentIndex !== -1) {
                var parentInverse = this._skeleton.getJoint(joint.parentIndex).inverseBindPose;
                localBind.appendAffine(parentInverse);
            }

            var pose = new HX.FBXAnimationConverter._JointPose();
            var transform = new HX.Transform();

            localBind.decompose(transform);

            pose["Lcl Translation"].copyFrom(transform.position);
            transform.rotation.toEuler(pose["Lcl Rotation"]);

            pose["Lcl Rotation"].x *= HX.RAD_TO_DEG;
            pose["Lcl Rotation"].y *= HX.RAD_TO_DEG;
            pose["Lcl Rotation"].z *= HX.RAD_TO_DEG;
            pose["Lcl Scaling"].copyFrom(transform.scale);

            tempJointPoses[i] = pose;
        }

        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            var jointIndex = node.data;

            // not a skeleton target?
            if (jointIndex === null) continue;

            var target = tempJointPoses[jointIndex][node.propertyName];

            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var value = node.curves[key].data[frame];
                switch (key) {
                    case "d|X":
                        target.x = value;
                        break;
                    case "d|Y":
                        target.y = value;
                        break;
                    case "d|Z":
                        target.z = value;
                        break;
                }
            }
        }

        for (var i = 0; i < numJoints; ++i) {
            var jointPose = new HX.SkeletonJointPose();

            var tempJointPose = tempJointPoses[i];
            jointPose.position.copyFrom(tempJointPose["Lcl Translation"]);
            // not supporting non-uniform scaling at this point
            jointPose.scale = tempJointPose["Lcl Scaling"].x;
            var rot = tempJointPose["Lcl Rotation"];
            jointPose.rotation.fromEuler(rot.x * HX.DEG_TO_RAD, rot.y * HX.DEG_TO_RAD, rot.z * HX.DEG_TO_RAD);
            skeletonPose.jointPoses[i] = jointPose;
        }

        skeletonPose.jointPoses[this._fakeJointIndex] = new HX.SkeletonJointPose();

        return skeletonPose;
    }
};

HX.FBXAnimationConverter._JointPose = function()
{
    this["Lcl Translation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Rotation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Scaling"] = new HX.Float4(1.0, 1.0, 1.0);
};
// Could also create an ASCII deserializer
HX.FBXBinaryDeserializer = function()
{
    this._version = 0;
};

HX.FBXBinaryDeserializer.prototype =
{
    get version() { return this._version },

    deserialize: function(dataStream)
    {
        this._data = dataStream;

        this._verifyHeader();

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();

        var root = new HX.FBXRecord();
        root.name = "[root]";
        this._deserializeNode(root);
        return root;
    },

    _verifyHeader: function()
    {
        if (this._data.getString(21) !== "Kaydara FBX Binary  \0")
            throw new Error("Incorrect FBX file header!");
    },

    _deserializeNode: function(parent)
    {
        var node;
        do {
            node = this._importNode();
            if (node) parent.children.push(node);
        } while (node);
    },

    _importNode: function()
    {
        var data = this._data;
        var endOffset = data.getUint32();
        var numProperties = data.getUint32();
        var propertyListLen = data.getUint32();
        var nameLen = data.getUint8();

        if (endOffset === 0) {
            if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0)
                throw new Error("Invalid null node!");
            return null;
        }

        var record = new HX.FBXRecord();
        record.name = data.getString(nameLen);

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset !== endOffset)
            this._deserializeNode(record);

        return record;
    },

    _parseDataElement: function()
    {
        var typeCode = this._data.getChar();

        switch (typeCode) {
            case HX.FBXBinaryDeserializer.BOOLEAN:
                return this._data.getUint8();
                break;
            case HX.FBXBinaryDeserializer.INT16:
                return this._data.getInt16();
                break;
            case HX.FBXBinaryDeserializer.INT32:
                return this._data.getInt32();
                break;
            case HX.FBXBinaryDeserializer.INT64:
                // just concatenating strings, since they're only used for ids
                return this._data.getInt64AsFloat64();
                break;
            case HX.FBXBinaryDeserializer.FLOAT:
                return this._data.getFloat32();
                break;
            case HX.FBXBinaryDeserializer.DOUBLE:
                return this._data.getFloat64();
                break;
            case HX.FBXBinaryDeserializer.STRING:
                var len = this._data.getUint32();
                return this._data.getString(len);
                break;
            case HX.FBXBinaryDeserializer.RAW:
                var len = this._data.getUint32();
                return this._data.getUint8Array(len);
                break;
            default:
                return this._parseArray(typeCode);
        }
    },

    _parseArray: function(type)
    {
        var len = this._data.getUint32();
        var encoding = this._data.getUint32();
        var compressedLength = this._data.getUint32();

        if (encoding === 0) {
            switch (type) {
                case HX.FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case HX.FBXBinaryDeserializer.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case HX.FBXBinaryDeserializer.INT64_ARRAY:
                    return this._data.getInt64AsFloat64Array(len);
                    break;
                case HX.FBXBinaryDeserializer.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case HX.FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else {
            var data = this._data.getUint8Array(compressedLength);
            data = pako.inflate(data).buffer;

            switch (type) {
                case HX.FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return new Uint8Array(data.buffer);
                case HX.FBXBinaryDeserializer.INT32_ARRAY:
                    return new Int32Array(data);
                case HX.FBXBinaryDeserializer.INT64_ARRAY:
                    var data = new HX.DataStream(new DataView(data));
                    return data.getInt64AsFloat64Array(data.byteLength / 8);
                case HX.FBXBinaryDeserializer.FLOAT_ARRAY:
                    return new Float32Array(data);
                case HX.FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return new Float64Array(data);
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
    }
};

HX.FBXBinaryDeserializer.INT16 = "Y";
HX.FBXBinaryDeserializer.BOOLEAN = "C";
HX.FBXBinaryDeserializer.INT32 = "I";
HX.FBXBinaryDeserializer.FLOAT = "F";
HX.FBXBinaryDeserializer.DOUBLE = "D";
HX.FBXBinaryDeserializer.INT64 = "L";

HX.FBXBinaryDeserializer.BOOLEAN_ARRAY = "b";
HX.FBXBinaryDeserializer.INT32_ARRAY = "i";
HX.FBXBinaryDeserializer.FLOAT_ARRAY = "f";
HX.FBXBinaryDeserializer.DOUBLE_ARRAY = "d";
HX.FBXBinaryDeserializer.INT64_ARRAY = "l";

HX.FBXBinaryDeserializer.STRING = "S";
HX.FBXBinaryDeserializer.RAW = "R";
// Could also create an ASCII deserializer
HX.FBXConverter = function()
{
    this._settings = null;
    this._objects = null;
    this._textureTokens = null;
    this._textureMaterialMap = null;
    this._rootNode = null;
};

HX.FBXConverter.prototype =
{
    get textureTokens() { return this._textureTokens; },
    get textureMaterialMap() { return this._textureMaterialMap; },

    convert: function(rootNode, animationStack, target, settings)
    {
        this._settings = settings;
        this._objects = [];
        this._textureTokens = [];
        this._textureMaterialMap = [];
        this._rootNode = rootNode;
        this._animationStack = animationStack;
        this._convertGroupNode(rootNode, target);
    },

    // handles object of type FbxNode
    _convertNode: function(fbxNode)
    {
        var hxNode;

        if (fbxNode.mesh)
            hxNode = this._convertModelMesh(fbxNode);
        else if (fbxNode.children && fbxNode.children.length > 1) {
            hxNode = new HX.GroupNode();
            this._convertGroupNode(fbxNode, hxNode);
        }
        else return null;

        hxNode.name = fbxNode.name;

        this._convertSceneGraphObject(fbxNode, hxNode);

        // TODO: handle lights, cameras, etc
        return hxNode;
    },

    _convertGroupNode: function(fbxNode, hxNode)
    {
        var len = fbxNode.children.length;
        for (var i = 0; i < len; ++i) {
            var childNode = this._convertNode(fbxNode.children[i]);
            if (childNode)
                hxNode.attach(childNode);
        }
    },

    _convertModelMesh: function(fbxNode)
    {
        var modelConverter = this._convertGeometry(fbxNode.mesh, fbxNode.geometryTransform);

        var materials = [];

        if (fbxNode.materials) {
            var numMaterials = fbxNode.materials.length;
            for (var i = 0; i < numMaterials; ++i) {
                materials[i] = this._convertMaterial(fbxNode.materials[i]);
            }
        }
        else {
            materials.push(new HX.PBRMaterial());
        }

        return modelConverter.createModelInstance(materials);
    },

    _convertSceneGraphObject: function(fbxNode, hxNode)
    {
        hxNode.transformationMatrix = fbxNode.matrix;
    },

    _convertGeometry: function(node, geometryMatrix)
    {
        if (this._objects[node.UID]) return this._objects[node.UID];

        var converter = new HX.FBXModelInstanceConverter();
        converter.convertToModel(node, this._animationStack, geometryMatrix, this._settings);

        this._objects[node.UID] = converter;
        return converter;
    },

    _convertMaterial: function(fbxMaterial)
    {
        if (this._objects[fbxMaterial.UID]) return this._objects[fbxMaterial.UID];

        var hxMaterial = new HX.PBRMaterial();
        hxMaterial.name = fbxMaterial.name;
        if (fbxMaterial.DiffuseColor) hxMaterial.color = fbxMaterial.DiffuseColor;
        if (fbxMaterial.Shininess) fbxMaterial.ShininessExponent = fbxMaterial.Shininess;
        if (fbxMaterial.ShininessExponent) hxMaterial.setRoughness(HX.PBRMaterial.roughnessFromShininess(fbxMaterial.Shininess));

        if (fbxMaterial.textures) {
            if (fbxMaterial.textures["NormalMap"])
                this._convertTexture(fbxMaterial.textures["NormalMap"], hxMaterial, HX.FBXConverter._TextureToken.NORMAL_MAP);

            // We don't support specular color, instead hijack as roughness
            if (fbxMaterial.textures["SpecularColor"])
                this._convertTexture(fbxMaterial.textures["SpecularColor"], hxMaterial, HX.FBXConverter._TextureToken.SPECULAR_MAP);

            if (fbxMaterial.textures["DiffuseColor"])
                this._convertTexture(fbxMaterial.textures["DiffuseColor"], hxMaterial, HX.FBXConverter._TextureToken.DIFFUSE_MAP);
        }

        this._objects[fbxMaterial.UID] = hxMaterial;
        return hxMaterial;
    },

    _convertTexture: function(fbxTexture, hxMaterial, mapType)
    {
        var token;
        if (this._objects[fbxTexture.UID]) {
            token = this._objects[fbxTexture.UID];
        }
        else {
            token = new HX.FBXConverter._TextureToken();
            token.name = fbxTexture.name;
            token.mapType = mapType;
            token.filename = fbxTexture.relativeFilename ? fbxTexture.relativeFilename : fbxTexture.video.relativeFilename;
            this._textureTokens.push(token);
            this._objects[fbxTexture.UID] = token;
        }

        var mapping = new HX.FBXConverter._TextureMaterialMapping(hxMaterial, token, mapType);
        this._textureMaterialMap.push(mapping);
    }
};

HX.FBXConverter._TextureMaterialMapping = function(material, token, mapType)
{
    this.material = material;
    this.token = token;
    this.mapType = mapType;
};

HX.FBXConverter._TextureToken = function()
{
    this.filename = null;
    this.name = null;
    this.UID = null;
};

HX.FBXConverter._TextureToken.NORMAL_MAP = 0;
HX.FBXConverter._TextureToken.SPECULAR_MAP = 1;
HX.FBXConverter._TextureToken.DIFFUSE_MAP = 2;
// Could also create an ASCII deserializer
/**
 *
 * @constructor
 */
HX.FBXGraphBuilder = function()
{
    this._settings = null;
    this._templates = null;
    this._objects = null;
    this._rootNode = null;
    this._animationStack = null;
    this._bindPoses = null;
};

HX.FBXGraphBuilder.prototype =
{
    get bindPoses() { return this._bindPoses; },
    get sceneRoot() { return this._rootNode; },
    get animationStack() { return this._animationStack; },

    build: function(rootRecord, settings)
    {
        this._settings = settings;
        this._templates = {};
        this._objects = {};
        this._bindPoses = null;

        // fbx scene node
        this._rootNode = new HX.FbxNode();
        this._rootNode.name = "hx_rootNode";

        // animations, we'll turn them into a SkeletonBlendTree eventually
        this._animationStack = null;

        // handle templates
        this._processTemplates(rootRecord.getChildByName("Definitions"));
        this._processObjects(rootRecord.getChildByName("Objects"));
        this._processConnections(rootRecord.getChildByName("Connections"));
    },

    _processTemplates: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var child = definitions.children[i];
            if (child.name === "ObjectType") {
                var template = child.getChildByName("PropertyTemplate");
                if (!template) continue;
                var subclass = template.data[0];
                var type = child.data[0];
                var node = this._createNode(type, subclass, template);

                if (node)
                    this._assignProperties(node, template.getChildByName("Properties70"));

                this._templates[type] = node;
            }
        }
    },

    _processObjects: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var obj = null;
            var node = definitions.children[i];
            switch (node.name) {
                case "Geometry":
                    obj = this._processGeometry(node);
                    break;
                case "NodeAttribute":
                    // at this point, we're only supporting meshes
                    // TODO: FbxNodeAttribute will be cast to FbxCamera etc
                    obj = new HX.FbxNodeAttribute();
                    obj.type = node.data[2];
                    break;
                case "Model":
                    obj = new HX.FbxNode();
                    obj.type = node.data[2];
                    // not sure if this is correct
                    break;
                case "Material":
                    obj = new HX.FbxMaterial();
                    break;
                case "Video":
                    obj = new HX.FbxVideo();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Texture":
                    obj = new HX.FbxFileTexture();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Pose":
                    obj = this._processPose(node);
                    this._bindPoses = this._bindPoses || [];
                    this._bindPoses.push(obj);
                    break;
                case "Deformer":
                    if (node.data[2] === "Skin")
                        obj = new HX.FbxSkin();
                    else
                        obj = this._processCluster(node);
                    break;
                case "AnimationStack":
                    obj = new HX.FbxAnimStack();
                    this._animationStack = obj;
                    break;
                case "AnimationLayer":
                    obj = new HX.FbxAnimLayer();
                    break;
                case "AnimationCurve":
                    obj = new HX.FbxAnimationCurve();
                    this._assignFlatData(obj, node);
                    var arr = [];
                    for (var j = 0; j < obj.KeyTime.length; ++j)
                        arr[j] = new HX.FbxTime(obj.KeyTime[j]);
                    obj.KeyTime = arr;
                    break;
                case "AnimationCurveNode":
                    obj = new HX.FbxAnimationCurveNode();
                    break;
                default:
                    // deal with some irrelevant nodes
                    obj = new HX.FbxTrashNode();
            }

            if (obj) {
                var uid = node.data[0];
                obj.name = this._getObjectDefName(node);
                obj.UID = uid;

                if (this._templates[node.name])
                    obj.copyProperties(this._templates[node.name]);

                this._assignProperties(obj, node.getChildByName("Properties70"));

                this._objects[uid] = obj;
            }
        }
    },

    _processPose: function(objDef)
    {
        var pose = new HX.FbxPose();
        pose.type = objDef.data[2];
        for (var i = 0; i < objDef.children.length; ++i) {
            var node = objDef.children[i];
            if (node.name === "PoseNode") {
                var poseNode = new HX.FbxPoseNode();
                poseNode.targetUID = node.getChildByName("Node").data[0];
                poseNode.matrix = new HX.Matrix4x4(node.getChildByName("Matrix").data[0]);
                pose.poseNodes.push(poseNode);
            }
        }
        return pose;
    },

    _processConnections: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var node = definitions.children[i];
            var mode = node.data[0];
            var child = this._objects[node.data[1]];
            var parent = this._objects[node.data[2]] || this._rootNode;

            //console.log(child.toString(), node.data[1], " -> ", parent.toString(), node.data[2], node.data[3]);

            if (mode === "OO")
                parent.connectObject(child);
            else if (mode === "OP")
                parent.connectProperty(child, node.data[3]);
        }
    },

    _createNode: function(name, subclass)
    {
        if (name === "Material")
            return new HX.FbxMaterial();

        if (HX[subclass]) return new HX[subclass];
    },

    _assignFlatData: function(target, node)
    {
        var len = node.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = node.children[i];
            if (target.hasOwnProperty(prop.name)) {
                target[prop.name] = prop.data[0];
            }
        }
    },

    _assignProperties: function(target, properties)
    {
        if (!properties) return;

        var len = properties.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = properties.children[i];
            if (target.hasOwnProperty(prop.data[0])) {
                target[prop.data[0]] = this._getPropertyValue(prop);
            }
        }
    },

    _getPropertyValue: function(prop)
    {
        var data = prop.data;
        switch (data[1]) {
            case "Vector3D":
            case "Lcl Translation":
            case "Lcl Scaling":
            case "Lcl Rotatfion":
                return new HX.Float4(data[4], data[5], data[6]);
            case "bool":
            case "Visibility":
            case "Visibility Inheritance":
                return data[4] !== 0;
            case "ColorRGB":
            case "Color":
                return new HX.Color(data[4], data[5], data[6]);
            case "enum":
            case "double":
            case "float":
            case "int":
            case "KString":
                return data[4];
            case "KTime":
                return new HX.FbxTime(data[4]);
            case "object":
                return null;    // TODO: this will be connected using OP?
        }
    },

    _processGeometry: function(objDef)
    {
        var geometry = new HX.FbxMesh();
        var len = objDef.children.length;
        var layerMap = {};

        for (var i = 0; i < len; ++i) {
            var child = objDef.children[i];
            switch (child.name) {
                case "Vertices":
                    geometry.vertices = child.data[0];
                    break;
                case "PolygonVertexIndex":
                    geometry.indices = child.data[0];
                    break;
                case "Layer":
                    geometry.layerElements = geometry.layerElements || {};
                    this._processLayer(child, layerMap, geometry.layerElements);
                    break;
                default:
                    if (!layerMap[child.name])
                        layerMap[child.name] = child;
                    break;
            }
        }
        return geometry;
    },

    _processLayer: function(objDef, layerMap, elements)
    {
        var len = objDef.children.length;
        for (var i = 0; i < len; ++i) {
            var layerElement = objDef.children[i];
            if (layerElement.name !== "LayerElement") continue;
            var name = layerElement.getChildByName("Type").data[0];
            // do not allow multiple sets
            if (!elements[layerElement.type]) {
                var layerElement = this._processLayerElement(layerMap[name]);
                elements[layerElement.type] = layerElement;
            }
        }
    },

    _processLayerElement: function(objDef)
    {
        var layerElement = new HX.FbxLayerElement();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "MappingInformationType":
                    var mapMode = node.data[0];
                    layerElement.mappingInformationType =   mapMode === "ByPolygonVertex"?  HX.FbxLayerElement.MAPPING_TYPE.BY_POLYGON_VERTEX :
                                                            mapMode === "ByPolygon"?        HX.FbxLayerElement.MAPPING_TYPE.BY_POLYGON :
                                                            mapMode === "AllSame"?          HX.FbxLayerElement.MAPPING_TYPE.ALL_SAME :
                                                                                            HX.FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT;
                    break;
                case "ReferenceInformationType":
                    layerElement.referenceInformationType = node.data[0] === "Direct"? HX.FbxLayerElement.REFERENCE_TYPE.DIRECT : HX.FbxLayerElement.REFERENCE_TYPE.INDEX_TO_DIRECT;
                    break;
                case "Normals":
                case "Colors":
                case "UV":
                case "Smoothing":
                    layerElement.type = node.name;
                    layerElement.directData = node.data[0];
                    break;
                case "NormalsIndex":
                case "ColorIndex":
                case "UVIndex":
                case "SmoothingIndex":
                    layerElement.indexData = node.data[0];
                    break;
                case "Materials":
                    layerElement.type = node.name;
                    layerElement.indexData = node.data[0];
                    break;
            }
        }

        return layerElement;
    },

    _getObjectDefName: function(objDef)
    {
        return objDef.data[1].split(HX.FBXGraphBuilder._STRING_DEMARCATION)[0];
    },

    _processCluster: function(objDef)
    {
        var cluster = new HX.FbxCluster();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "Transform":
                    cluster.transform = new HX.Matrix4x4(node.data[0]);
                    break;
                case "TransformLink":
                    cluster.transformLink = new HX.Matrix4x4(node.data[0]);
                    break;
                case "Indexes":
                    cluster.indices = node.data[0];
                    break;
                case "Weights":
                    cluster.weights = node.data[0];
                    break;
            }
        }

        return cluster;
    }
};

HX.FBXGraphBuilder._STRING_DEMARCATION = String.fromCharCode(0, 1);
/**
 *
 * @constructor
 */
HX.FBXModelInstanceConverter = function()
{
    this._perMaterialData = null;
    this._expandedMesh = null;
    this._vertexStride = 0;
    this._ctrlPointLookUp = null;
    this._model = null;
    this._animationConverter = null;
    this._fakeJointIndex = -1;
    this._useSkinning = false;
};

HX.FBXModelInstanceConverter.prototype =
{
    // to be called after convertToModel
    createModelInstance: function(materials)
    {
        var expandedMaterials = [];

        var len = this._modelMaterialIDs.length;
        for (var i = 0; i < len; ++i) {
            expandedMaterials[i] = materials[this._modelMaterialIDs[i]];
        }

        var modelInstance = new HX.ModelInstance(this._model, expandedMaterials);
        var clips = this._animationConverter.animationClips;
        if (clips) {
            if (clips.length === 1)
                modelInstance.addComponent(new HX.SkeletonAnimation(clips[0]));
            else
                throw new Error("TODO! Implement blend node");
        }

        return modelInstance;
    },

    convertToModel: function(fbxMesh, fbxAnimationStack, geometryMatrix, settings)
    {
        this._perMaterialData = [];
        this._ctrlPointLookUp = [];
        this._modelMaterialIDs = [];
        this._useSkinning = false;

        this._modelData = new HX.ModelData();
        this._animationConverter = new HX.FBXAnimationConverter();

        if (fbxMesh.deformers)
            this._generateSkinningData(fbxMesh, geometryMatrix);
        this._generateExpandedMeshData(fbxMesh, geometryMatrix);

        this._vertexStride = HX.MeshData.DEFAULT_VERTEX_SIZE;
        if (this._expandedMesh.hasColor)
            this._vertexStride += 3;

        this._splitPerMaterial();
        this._generateModel();
        if (fbxMesh.deformers)
            this._animationConverter.convertClips(fbxAnimationStack, fbxMesh, geometryMatrix, settings);
        this._model.name = fbxMesh.name;
    },

    _generateExpandedMeshData: function(fbxMesh, matrix)
    {
        this._expandedMesh = new HX.FBXModelInstanceConverter._ExpandedMesh();
        var indexData = fbxMesh.indices;
        var vertexData = fbxMesh.vertices;
        var normalData, colorData, uvData, materialData;
        var layerElements = fbxMesh.layerElements;
        if (layerElements) {
            normalData = layerElements["Normals"];
            colorData = layerElements["Colors"];
            uvData = layerElements["UV"];
            materialData = layerElements["Materials"];
        }

        var vertices = [];
        var polyIndex = 0;
        var maxMaterialIndex = 0;

        if (normalData) this._expandedMesh.hasNormals = true;
        if (colorData) this._expandedMesh.hasColor = true;
        if (uvData) this._expandedMesh.hasUVs = true;

        var len = indexData.length;

        for (var i = 0; i < len; ++i) {
            var ctrlPointIndex = indexData[i];
            var v = new HX.FBXModelInstanceConverter._Vertex();

            if (ctrlPointIndex < 0) {
                ctrlPointIndex = -ctrlPointIndex - 1;
                v.lastVertex = true;
            }

            v.pos.x = vertexData[ctrlPointIndex * 3];
            v.pos.y = vertexData[ctrlPointIndex * 3 + 1];
            v.pos.z = vertexData[ctrlPointIndex * 3 + 2];

            if (matrix)
                matrix.transformPoint(v.pos, v.pos);

            if (this._modelData.skeleton)
                v.jointBindings = this._animationConverter.getJointBinding(ctrlPointIndex);

            v.ctrlPointIndex = ctrlPointIndex;   // if these indices are different, they are probably triggered differerently in animations

            if (normalData) {
                v.normal = this._extractLayerData(normalData, ctrlPointIndex, i, 3);
                if (matrix)
                    matrix.transformVector(v.normal, v.normal);
            }
            if (colorData) v.color = this._extractLayerData(colorData, ctrlPointIndex, i, 3);
            if (uvData) v.uv = this._extractLayerData(uvData, ctrlPointIndex, i, 2);

            if (materialData && materialData.mappingInformationType !== HX.FbxLayerElement.MAPPING_TYPE.ALL_SAME) {
                var matIndex = materialData.indexData[polyIndex];
                v.materialIndex = matIndex;
                if (matIndex > maxMaterialIndex)
                    maxMaterialIndex = matIndex;
            }

            if (v.lastVertex)
                ++polyIndex;

            vertices[i] = v;
        }

        this._expandedMesh.vertices = vertices;
        this._expandedMesh.numMaterials = maxMaterialIndex + 1;
    },

    _extractLayerData: function (layer, index, i, numComponents)
    {
        var target = numComponents > 2? new HX.Float4() : new HX.Float2();
        // direct
        if (layer.referenceInformationType === HX.FbxLayerElement.REFERENCE_TYPE.DIRECT) {
            var directIndex = layer.mappingInformationType === HX.FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? index : i;
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        // index to direct
        else {
            var directIndex = layer.mappingInformationType === HX.FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? layer.indexData[index] : layer.indexData[i];
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        return target;
    },

    _splitPerMaterial: function()
    {
        for (var i = 0; i < this._expandedMesh.numMaterials; ++i)
            this._perMaterialData[i] = new HX.FBXModelInstanceConverter._PerMaterialData();

        // todo: change this expansion
        var i = 0, j = 0;
        var vertexData = this._expandedMesh.vertices;
        var len = vertexData.length;
        var realIndex0, realIndex1, realIndex2;
        var startNewBatch = true;

        // triangulate
        while (i < len) {
            var data = this._perMaterialData[vertexData[i].materialIndex];
            if (!data.vertices) startNewBatch = true;
            // start as startNewBatch, so we push the current list on the stack
            if (startNewBatch) {
                startNewBatch = false;
                data.indexCounter = 0;
                data.indices = [];
                data.vertices = [];
                data.ctrlPointIndices = [];
                data.indexLookUp = {};
                data.indexStack.push(data.indices);
                data.vertexStack.push(data.vertices);
                data.ctrlPointStack.push(data.ctrlPointIndices);

                if (this._useSkinning) {
                    data.skinning = [];
                    data.skinningStack.push(data.skinning);
                }
            }

            // for everything: i = control point index

            realIndex0 = this._getOrAddIndex(vertexData[i]);
            if (realIndex0 < 0) {
                startNewBatch = true;
                continue;
            }
            realIndex1 = this._getOrAddIndex(vertexData[i + 1]);
            if (realIndex1 < 0) {
                startNewBatch = true;
                continue;
            }

            i += 2;

            var v2;

            do {
                v2 = vertexData[i];
                realIndex2 = this._getOrAddIndex(v2);

                if (realIndex2 < 0) {
                    startNewBatch = true;
                }
                else {
                    ++i;

                    var indices = this._perMaterialData[v2.materialIndex].indices;
                    indices[j] = realIndex0;
                    indices[j + 1] = realIndex1;
                    indices[j + 2] = realIndex2;

                    j += 3;
                    realIndex1 = realIndex2;
                }
            } while (!v2.lastVertex && !startNewBatch);
        }
    },

    // returns negative if overflow is detected
    _getOrAddIndex: function(v)
    {
        var hash = v.getHash();
        var data = this._perMaterialData[v.materialIndex];
        var indexLookUp = data.indexLookUp;

        if (indexLookUp.hasOwnProperty(hash))
            return indexLookUp[hash];

        if (data.indexCounter > 65535) return -1;

        var skinning = data.skinning;
        var vertices = data.vertices;
        var realIndex = data.indexCounter++;
        // new unique vertex!
        var k = realIndex * this._vertexStride;
        var s = realIndex * 8;

        data.ctrlPointIndices[v.ctrlPointIndex] = realIndex;

        indexLookUp[hash] = realIndex;

        // position
        vertices[k] = v.pos.x;
        vertices[k + 1] = v.pos.y;
        vertices[k + 2] = v.pos.z;

        if (skinning) {
            var binding = v.jointBindings;
            var numJoints = binding? binding.length : 0;
            if (numJoints > 4) {
                numJoints = 4;
                console.warn("Warning: more than 4 joints not supported. Model will not animate correctly");

                // make sure we discard the least important ones
                binding.sort(function(a, b) { return b.jointWeight - a.jointWeight; });
            }

            var w = 0.0;
            for (var i = 0; i < numJoints; ++i) {
                var weight = binding[i].jointWeight;
                skinning[s + i] = binding[i].jointIndex;
                skinning[s + i + 4] = weight;
                w += weight;
            }

            // need to fill up with ever-static joint
            w = w >= 1.0? 0.0 : 1.0 - w;

            for (var i = numJoints; i < 4; ++i) {
                skinning[s + i] = this._fakeJointIndex;
                skinning[s + i + 4] = i === numJoints? w : 0.0;
            }
        }

        // normal
        if (this._expandedMesh.hasNormals) {
            vertices[k + 3] = v.normal.x;
            vertices[k + 4] = v.normal.y;
            vertices[k + 5] = v.normal.z;
        }
        else
            vertices[k + 3] = vertices[k + 4] = vertices[k + 5] = 0;

        // tangent & flipsign
        vertices[k + 6] = vertices[k + 7] = vertices[k + 8] = vertices[k + 9] = 0;

        if (this._expandedMesh.hasUVs) {
            vertices[k + 10] = v.uv.x;
            vertices[k + 11] = v.uv.y;
        }
        else
            vertices[k + 10] = vertices[k + 11] = 0;

        if (this._expandedMesh.hasColor) {
            vertices[k + 12] = v.color.x;
            vertices[k + 13] = v.color.y;
            vertices[k + 14] = v.color.z;
        }

        return realIndex;
    },

    _generateModel: function()
    {
        var meshIndex = 0;

        var numMaterials = this._expandedMesh.numMaterials;

        for (var i = 0; i < numMaterials; ++i) {
            var data = this._perMaterialData[i];

            var stackSize = data.indexStack.length;
            for (var j = 0; j < stackSize; ++j) {
                var meshData = HX.MeshData.createDefaultEmpty();
                if (this._expandedMesh.hasColor) meshData.addVertexAttribute("hx_vertexColor", 3);

                meshData.setVertexData(data.vertexStack[j], 0);
                meshData.setIndexData(data.indexStack[j]);

                if (this._useSkinning) {
                    meshData.addVertexAttribute("hx_boneIndices", 4, 1);
                    meshData.addVertexAttribute("hx_boneWeights", 4, 1);
                    meshData.setVertexData(data.skinningStack[j], 1);
                }

                var ctrlPoints = data.ctrlPointStack[j];
                var numCtrlPoints = ctrlPoints.length;

                for (var k = 0; k < numCtrlPoints; ++k)
                    this._ctrlPointLookUp[ctrlPoints[k]] = {index: k, meshIndex: meshIndex};

                ++meshIndex;

                this._modelMaterialIDs.push(i);

                var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
                if (!this._expandedMesh.hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
                var generator = new HX.NormalTangentGenerator();
                generator.generate(meshData, mode);
                this._modelData.addMeshData(meshData);
            }
        }

        this._model = new HX.Model(this._modelData);
    },

    _generateSkinningData: function(fbxMesh, geometryMatrix)
    {
        var len = fbxMesh.deformers.length;
        if (len === 0) return;
        if (len > 1) throw new Error("Multiple skins not supported");

        this._animationConverter.convertSkin(fbxMesh.deformers[0], geometryMatrix);
        this._modelData.skeleton = this._animationConverter.skeleton;
        this._useSkinning = true;
    }
};

HX.FBXModelInstanceConverter._ExpandedMesh = function()
{
    this.vertices = null;
    this.hasColor = false;
    this.hasUVs = false;
    this.hasNormals = false;
    this.numMaterials = 0;
};

HX.FBXModelInstanceConverter._JointBinding = function()
{
    this.jointIndex = 0;
    this.jointWeight = 0;
};

HX.FBXModelInstanceConverter._Vertex = function()
{
    this.pos = new HX.Float4();
    this.uv = null;
    this.normal = null;
    this.color = null;
    this.materialIndex = 0;
    this.ctrlPointIndex = -1;
    this.jointBindings = null;   // array of JointBindings
    this._hash = null;
    this.lastVertex = false;
};

HX.FBXModelInstanceConverter._Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash) {
            var str = this.ctrlPointIndex + "/" + this.materialIndex + "/" + this.pos.x + "/" + this.pos.y + "/" + this.pos.z;

            if (this.normal)
                str = str + "/" + this.normal.x + "/" + this.normal.y + "/" + this.normal.z;

            if (this.uv)
                str = str + "/" + this.uv.x + "/" + this.uv.y;

            if (this.color)
                str = str + "/" + this.color.x + "/" + this.color.y + "/" + this.color.z;

            this._hash = str;
        }

        return this._hash;
    }
};

HX.FBXModelInstanceConverter._PerMaterialData = function()
{
    this.indexCounter = 0;
    this.vertexStack = [];
    this.skinningStack = [];
    this.indexStack = [];
    this.ctrlPointStack = [];
    this.vertices = null;
    this.indices = null;
    this.skinning = null;
    this.ctrlPointIndices = null;
    this.indexLookUp = {};
};
// this is used to represent the file contents itself, not translated to connected nodes yet
HX.FBXRecord = function()
{
    this.name = "";
    this.data = [];
    this.children = [];
};

HX.FBXRecord.prototype =
{
    getChildByName: function(name)
    {
        var len = this.children.length;
        for (var i = 0; i < len; ++i) {
            var child = this.children[i];
            if (child.name === name) return child;
        }
    },

    printDebug: function (printData, lvl)
    {
        if (printData === undefined) printData = true;
        if (lvl === undefined) lvl = 0;

        var padding = "";
        for (var i = 0; i < lvl; ++i)
            padding += "\t";

        console.log(padding + this.name);

        if (printData && this.data.length > 0) {
            console.log(padding + "\t[data] {");
            for (var i = 0; i < this.data.length; ++i) {
                console.log(padding + "\t\t[" + i + "] : " + this.data[i]);
            }
            console.log(padding + "}");
        }

        for (var i = 0; i < this.children.length; ++i)
            this.children[i].printDebug(printData, lvl + 1);
    }
};
// Could also create an ASCII deserializer
HX.FBXSettings = function()
{
    this._matrix = new HX.Matrix4x4();
    this._frameRate = 24;
    // start with indentity matrix
    // SWAP column[up axis index] with column[1]
    // SWAP column[front axis index] with column[2
    // multiply respective columns with signs
};

HX.FBXSettings.prototype =
{
    get orientationMatrix() { return this._matrix; },
    get frameRate() { return this._frameRate; },

    init: function(rootRecord)
    {
        var upAxisIndex = 1;
        var upAxisSign = 1;
        var frontAxisIndex = 2;
        var frontAxisSign = 1;
        var global = rootRecord.getChildByName("GlobalSettings");
        var props = global.getChildByName("Properties70");
        var len = props.children.length;
        var keyFrames = [ 0, 120, 100, 60, 50, 48, 30 ];

        for (var i = 0; i < len; ++i) {
            var p = props.children[i];
            switch (p.data[0]) {
                case "UpAxis":
                    upAxisIndex = p.data[4];
                    break;
                case "UpAxisSign":
                    upAxisSign = p.data[4];
                    break;
                case "FrontAxis":
                    frontAxisIndex = p.data[4];
                    break;
                case "FrontAxisSign":
                    frontAxisSign = p.data[4];
                    break;
                case "TimeMode":
                    if (keyFrames[p.data[4]])
                        this._frameRate = keyFrames[p.data[4]];
                    break;
            }
        }

        var axes = [ HX.Float4.X_AXIS, HX.Float4.Y_AXIS, HX.Float4.Z_AXIS ];
        var fwd = axes[frontAxisIndex].clone();
        var up = axes[upAxisIndex].clone();
        fwd.scale(frontAxisSign);
        up.scale(upAxisSign);
        this._matrix.lookAt(fwd, HX.Float4.ORIGIN_POINT, up);
        this._matrix.invert();
    }
};

/**
 *
 * @constructor
 */
HX.MTL = function()
{
    HX.Importer.call(this, Object, HX.URLLoader.DATA_TEXT);
    this._textures = [];
    this._texturesToLoad = [];
    this._activeMaterial = null;
};

HX.MTL.prototype = Object.create(HX.Importer.prototype);

HX.MTL.prototype.parse = function(data, target)
{
    var lines = data.split("\n");
    var numLines = lines.length;

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line, target);
    }

    this._loadTextures(target);

    return target;
};

HX.MTL.prototype._parseLine = function(line, target)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "newmtl":
            this._activeMaterial = new HX.PBRMaterial();
            this._activeMaterial.name = tokens[1];
            target[tokens[1]] = this._activeMaterial;
            break;
        case "ns":
            var specularPower = parseFloat(tokens[1]);
            this._activeMaterial.setRoughness(HX.PBRMaterial.roughnessFromShininess(specularPower));
            break;
        case "kd":
            this._activeMaterial.color = new HX.Color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            break;
        case "map_kd":
            this._activeMaterial.colorMap = this._getTexture(tokens[1]);
            break;
        case "map_d":
            this._activeMaterial.maskMap = this._getTexture(tokens[1]);
            this._activeMaterial.alphaThreshold = .5;
            break;
        case "map_ns":
            this._activeMaterial.specularMap = this._getTexture(tokens[1]);
            break;
        case "map_bump":
        case "bump":
            this._activeMaterial.normalMap = this._getTexture(tokens[1]);
            break;
        default:
        //console.log("MTL tag ignored or unsupported: " + tokens[0]);
    }
};

HX.MTL.prototype._getTexture = function(url)
{
    if (!this._textures[url]) {
        this._textures[url] = new HX.Texture2D();

        this._texturesToLoad.push({
            file: this._correctURL(url),
            importer: HX.JPG,
            target: this._textures[url]
        });
    }
    return this._textures[url];
};

HX.MTL.prototype._loadTextures = function(lib)
{
    var files = this._texturesToLoad;
    var len = files.length;
    if (len === 0) {
        this._notifyComplete(lib);
        return;
    }

    var self = this;
    var bulkLoader = new HX.BulkAssetLoader();

    bulkLoader.onComplete = function() {
        self._notifyComplete(lib);
    };

    bulkLoader.onFail = function(message) {
        self._notifyFailure(message);
    };

    bulkLoader.load(files);
};

/**
 * The options property supports the following settings:
 * - groupsAsObjects
 * @constructor
 */
HX.OBJ = function()
{
    HX.Importer.call(this, HX.GroupNode);
    this._objects = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._hasNormals = false;
    this._defaultMaterial = new HX.PBRMaterial();
    this._target = null;
    this._mtlLibFile = null;
};

HX.OBJ.prototype = Object.create(HX.Importer.prototype);

HX.OBJ.prototype.parse = function(data, target)
{
    this._groupsAsObjects = this.options.groupsAsObjects === undefined? true : this._groupsAsObjects;
    this._target = target;

    var lines = data.split("\n");
    var numLines = lines.length;

    this._pushNewObject("hx_default");

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line);
    }

    if (this._mtlLibFile)
        this._loadMTLLib(this._mtlLibFile);
    else
        this._finish(null);
};

HX.OBJ.prototype._finish = function(mtlLib)
{
    this._translate(mtlLib);
    this._notifyComplete(this._target);
};

HX.OBJ.prototype._loadMTLLib = function(filename)
{
    var loader = new HX.AssetLoader(HX.MTL);
    var self = this;

    loader.onComplete = function (asset)
    {
        self._finish(asset);
    };

    loader.onFail = function (message)
    {
        self._notifyFailure(message);
    };

    loader.load(filename);
};

HX.OBJ.prototype._parseLine = function(line)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "mtllib":
            this._mtlLibFile = this._correctURL(tokens[1]);
            break;
        case "usemtl":
            this._setActiveSubGroup(tokens[1]);
            break;
        case "v":
            this._vertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            break;
        case "vt":
            this._uvs.push(parseFloat(tokens[1]), parseFloat(tokens[2]));
            break;
        case "vn":
            this._normals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            break;
        case "o":
            this._pushNewObject(tokens[1]);
            break;
        case "g":
            if (this._groupsAsObjects)
                this._pushNewObject(tokens[1]);
            else
                this._pushNewGroup(tokens[1]);

            break;
        case "f":
            this._parseFaceData(tokens);
            break;
        default:
            // ignore following tags:
            // s
            //console.log("OBJ tag ignored or unsupported: " + tokens[0]);
    }
};

HX.OBJ.prototype._pushNewObject = function(name)
{
    this._activeObject = new HX.OBJ._ObjectData();
    this._activeObject.name = name;
    this._objects.push(this._activeObject);
    this._pushNewGroup("hx_default");
};

HX.OBJ.prototype._pushNewGroup = function(name)
{
    this._activeGroup = new HX.OBJ._GroupData();
    this._activeGroup.name = name || "Group" + this._activeGroup.length;

    this._activeObject.groups.push(this._activeGroup);
    this._setActiveSubGroup("hx_default");
};

HX.OBJ.prototype._setActiveSubGroup = function(name)
{
    this._activeGroup.subgroups[name] = this._activeGroup.subgroups[name] || new HX.OBJ._SubGroupData();
    this._activeSubGroup = this._activeGroup.subgroups[name];
};

HX.OBJ.prototype._parseFaceData = function(tokens)
{
    var face = new HX.OBJ._FaceData();
    var numTokens = tokens.length;

    for (var i = 1; i < numTokens; ++i) {
        var faceVertexData = new HX.OBJ._FaceVertexData();
        face.vertices.push(faceVertexData);

        var indices = tokens[i].split("/");
        var index = (indices[0] - 1) * 3;

        faceVertexData.posX = this._vertices[index];
        faceVertexData.posY = this._vertices[index + 1];
        faceVertexData.posZ = this._vertices[index + 2];

        if(indices.length > 1) {
            index = (indices[1] - 1) * 2;

            faceVertexData.uvU = this._uvs[index];
            faceVertexData.uvV = this._uvs[index + 1];

            if (indices.length > 2) {
                index = (indices[2] - 1) * 3;
                this._hasNormals = true;
                faceVertexData.normalX = this._normals[index];
                faceVertexData.normalY = this._normals[index + 1];
                faceVertexData.normalZ = this._normals[index + 2];
            }
        }
    }

    this._activeSubGroup.faces.push(face);
    this._activeSubGroup.numIndices += tokens.length === 4 ? 3 : 6;
};

HX.OBJ.prototype._translate = function(mtlLib)
{
    var numObjects = this._objects.length;
    for (var i = 0; i < numObjects; ++i) {
        this._translateObject(this._objects[i], mtlLib);
    }
};

HX.OBJ.prototype._translateObject = function(object, mtlLib)
{
    var numGroups = object.groups.length;
    if (numGroups === 0) return;
    var modelData = new HX.ModelData();
    var materials = [];
    var model = new HX.Model();

    for (var i = 0; i < numGroups; ++i) {
        var group = object.groups[i];

        for (var key in group.subgroups)
        {
            if (group.subgroups.hasOwnProperty(key)) {
                var subgroup = group.subgroups[key];
                if (subgroup.numIndices === 0) continue;
                modelData.addMeshData(this._translateMeshData(subgroup));

                var material = mtlLib? mtlLib[key] : null;
                material = material || this._defaultMaterial;
                materials.push(material);
            }
        }
    }

    model._setModelData(modelData);

    var modelInstance = new HX.ModelInstance(model, materials);
    modelInstance.name = object.name;
    this._target.attach(modelInstance);
};

HX.OBJ.prototype._translateMeshData = function(group)
{
    var meshData = HX.MeshData.createDefaultEmpty();
    var realIndices = [];
    var indices = new Array(group.numIndices);
    var numVertices = 0;
    var currentIndex = 0;

    var faces = group.faces;
    var numFaces = faces.length;
    for (var i = 0; i < numFaces; ++i) {
        var face = faces[i];

        var faceVerts = face.vertices;
        var numVerts = faceVerts.length;

        for (var j = 0; j < numVerts; ++j) {
            var vert = faceVerts[j];
            var hash = vert.getHash();
            if (!realIndices.hasOwnProperty(hash))
                realIndices[hash] = {index: numVertices++, vertex: vert};
        }

        indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
        indices[currentIndex+1] = realIndices[faceVerts[1].getHash()].index;
        indices[currentIndex+2] = realIndices[faceVerts[2].getHash()].index;
        currentIndex += 3;

        if (numVerts === 4) {
            indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
            indices[currentIndex+1] = realIndices[faceVerts[2].getHash()].index;
            indices[currentIndex+2] = realIndices[faceVerts[3].getHash()].index;
            currentIndex += 3;
        }
    }

    var vertices = new Array(numVertices * HX.MeshData.DEFAULT_VERTEX_SIZE);

    for (var hash in realIndices) {
        if (!realIndices.hasOwnProperty(hash)) continue;
        var data = realIndices[hash];
        var vertex = data.vertex;
        var index = data.index * HX.MeshData.DEFAULT_VERTEX_SIZE;

        vertices[index] = vertex.posX;
        vertices[index+1] = vertex.posY;
        vertices[index+2] = vertex.posZ;
        vertices[index+3] = vertex.normalX;
        vertices[index+4] = vertex.normalY;
        vertices[index+5] = vertex.normalZ;
        vertices[index+6] = 0;
        vertices[index+7] = 0;
        vertices[index+8] = 0;
        vertices[index+9] = 1;
        vertices[index+10] = vertex.uvU;
        vertices[index+11] = vertex.uvV;
    }

    meshData.setVertexData(vertices, 0);
    meshData.setIndexData(indices);

    var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
    if (!this._hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
    var generator = new HX.NormalTangentGenerator();
    generator.generate(meshData, mode, true);
    return meshData;
};

HX.OBJ._FaceVertexData = function()
{
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.uvU = 0;
    this.uvV = 0;
    this.normalX = 0;
    this.normalY = 0;
    this.normalZ = 0;
    this._hash = "";
};

HX.OBJ._FaceVertexData.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.posX + "/" + this.posY + "/" + this.posZ + "/" + this.uvU + "/" + this.uvV + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};

HX.OBJ._FaceData = function()
{
    this.vertices = []; // <FaceVertexData>
};

HX.OBJ._SubGroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
};

HX.OBJ._GroupData = function()
{
    this.subgroups = [];
    this.name = "";    // <FaceData>
    this._activeMaterial = null;
};

HX.OBJ._ObjectData = function()
{
    this.name = "";
    this.groups = [];
    this._activeGroup = null;
};
HX.FbxAnimationCurve = function()
{
    HX.FbxObject.call(this);
    this.Default = undefined;
    this.KeyVer = 0.0;
    this.KeyTime = 0.0;
    this.KeyValueFloat = null;
    this.KeyAttrFlags = 0.0;
    this.KeyAttrDataFloat = null;
    this.KeyAttrRefCount = 0.0;
};

HX.FbxAnimationCurve.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurve.prototype.toString = function() { return "[FbxAnimationCurve(name="+this.name+")]"; };
HX.FbxAnimationCurveNode = function()
{
    HX.FbxObject.call(this);
    this.curves = null;
    // are these weights?
    this["d|X"] = 0.0;
    this["d|Y"] = 0.0;
    this["d|Z"] = 0.0;
    this.propertyName = null;
};

HX.FbxAnimationCurveNode.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurveNode.prototype.toString = function() { return "[FbxAnimationCurveNode(name="+this.name+")]"; };

HX.FbxAnimationCurveNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxAnimationCurve) {
        this.curves = this.curves || {};
        this.curves[propertyName] = obj;
    }
};
HX.FbxAnimLayer = function()
{
    HX.FbxObject.call(this);
    this.curveNodes = null;
};

HX.FbxAnimLayer.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimLayer.prototype.toString = function() { return "[FbxAnimLayer(name="+this.name+")]"; };

HX.FbxAnimLayer.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxAnimationCurveNode) {
        this.curveNodes = this.curveNodes || [];
        this.curveNodes.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

HX.FbxAnimStack = function()
{
    HX.FbxObject.call(this);

    this.LocalStart = 0;
    this.LocalStop = 0;
    this.ReferenceStart = 0;
    this.ReferenceStop = 0;

    this.layers = null;
};

HX.FbxAnimStack.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxAnimStack.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxAnimLayer) {
        this.layers = this.layers || [];
        this.layers.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

HX.FbxAnimStack.prototype.toString = function() { return "[FbxAnimStack(name="+this.name+")]"; };
HX.FbxCluster = function()
{
    HX.FbxObject.call(this);
    this.limbNode = null;
    this.transform = null;
    this.transformLink = null;
    this.indices = null;
    this.weights = null;
};

HX.FbxCluster.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxCluster.prototype.toString = function() { return "[FbxCluster(name="+this.name+")]"; };

HX.FbxCluster.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxNode) {
        this.limbNode = obj;
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};
HX.FbxFileTexture = function()
{
    HX.FbxObject.call(this);
    this.WrapModeU = 0;
    this.WrapModeV = 0;
    //this.UVSet = null;    // we only support a single uv set

    this.relativeFilename = null;
    this.video = null;
};

HX.FbxFileTexture.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxFileTexture.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxVideo)
        this.video = obj;
    else
        throw new Error("Incompatible child object!");
};

HX.FbxFileTexture.prototype.toString = function() { return "[FbxFileTexture(name="+this.name+")]"; };
HX.FbxLayerElement = function()
{
    HX.FbxObject.call(this);
    this.directData = null;
    this.indexData = null;
    this.type = null;   // can be normal, uv, etc ...
    this.mappingInformationType = 0;
    this.referenceInformationType = 0;
};

HX.FbxLayerElement.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxLayerElement.MAPPING_TYPE = {
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};

HX.FbxLayerElement.REFERENCE_TYPE = {
    DIRECT: 1,
    INDEX_TO_DIRECT: 2
};

HX.FbxLayerElement.prototype.toString = function() { return "[FbxLayerElement(name="+this.name+")]"; };
HX.FbxMaterial = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.EmissiveColor = null;
    this.EmissiveFactor = 1;
    this.DiffuseColor = null;
    this.DiffuseFactor = 1;
    //this.NormalMap = null;
    this.ShininessExponent = undefined;
    this.Shininess = undefined;

    this.textures = null;
};

HX.FbxMaterial.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMaterial.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxFileTexture) {
        this.textures = this.textures || {};
        this.textures[propertyName] = obj;
    }
    else
        throw new Error("Unknown object property!");
};

HX.FbxMaterial.prototype.toString = function() { return "[FbxMaterial(name="+this.name+")]"; };
/**
 *
 * @constructor
 */
HX.FbxMesh = function()
{
    HX.FbxObject.call(this);
    this.Color = null;
    this["Casts Shadows"] = true;

    this.vertices = null;
    this.layerElements = null;
    this.deformers = null;
};

HX.FbxMesh.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMesh.prototype.toString = function() { return "[FbxMesh(name="+this.name+")]"; };

HX.FbxMesh.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxSkin) {
        this.deformers = this.deformers || [];
        this.deformers.push(obj);
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};
// probably needs to be subclasses for Light, Camera, etc
HX.FbxNodeAttribute = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.type = null;
};

HX.FbxNodeAttribute.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxNodeAttribute.prototype.toString = function() { return "[FbxNodeAttribute(name="+this.name+", type="+this.type+")]"; };
HX.FbxPose = function()
{
    HX.FbxObject.call(this);
    this.type = null;
    this.poseNodes = [];
};

HX.FbxPose.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxPose.prototype.toString = function() { return "[FbxPose(name="+this.name+")]"; };

HX.FbxPoseNode = function()
{
    this.targetUID = null;
    this.matrix = null;
}
HX.FbxSkin = function()
{
    HX.FbxObject.call(this);
    this.clusters = null;

    // data will contain the converter
};

HX.FbxSkin.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxSkin.prototype.toString = function() { return "[FbxSkin(name="+this.name+")]"; };

HX.FbxSkin.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxCluster) {
        this.clusters = this.clusters || [];
        this.clusters.push(obj);
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};
HX.FbxTime = function(value)
{
    this._value = value;
};

HX.FbxTime.getSpan = function(start, stop)
{
    return new HX.FbxTime(stop._value - start._value);
};

HX.FbxTime.TC_MILLISECOND = 46186158;

HX.FbxTime.prototype =
{
    get milliseconds()
    {
        return this._value / HX.FbxTime.TC_MILLISECOND;
    },

    set milliseconds(value)
    {
        this._value = value * HX.FbxTime.TC_MILLISECOND;
    },

    getFrameCount: function(frameRate)
    {
        return Math.floor(this.milliseconds / 1000.0 * frameRate);
    },

    toString: function()
    {
        return "[FbxTime(name="+this._value+")]";
    }
};
HX.FbxTrashNode = function()
{
    HX.FbxObject.call(this);
};

HX.FbxTrashNode.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxTrashNode.prototype.toString = function() { return "[FbxTrashNode(name="+this.name+")]"; };

// ignore
HX.FbxTrashNode.prototype.connectObject = function(obj) {}
HX.FbxVideo = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.relativeFilename = null;
};

HX.FbxVideo.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxVideo.prototype.toString = function() { return "[FbxVideo(name="+this.name+")]"; };