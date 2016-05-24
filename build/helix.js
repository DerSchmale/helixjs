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
"use strict";

var HX = {
    VERSION: '0.1',
    INITIALIZED: false,
    // generated by the build process, used in stats so you can be sure the correct build is used
    BUILD_HASH: 0
};

var HX_GL = null;

/**
 * Provides a set of options to configure Helix
 * @constructor
 */
HX.InitOptions = function()
{
    this.maxBones = 64;

    // rendering pipeline options
    this.useHDR = false;   // only if available
    this.useGammaCorrection = true;
    this.usePreciseGammaCorrection = false;  // Uses pow 2.2 instead of 2 for gamma correction, only valid if useGammaCorrection is true

    // provide an array of light types if you wish to extend the direct lights with your own types
    this.customLights = [];

    // debug-related
    this.debug = false;   // requires webgl-debug.js:
    this.ignoreAllExtensions = false;           // ignores all non-default extensions
    this.ignoreDrawBuffersExtension = false;     // forces multiple passes for the GBuffer
    this.ignoreDepthTexturesExtension = false;     // forces storing depth info explicitly
    this.ignoreTextureLODExtension = false;     // forces storing depth info explicitly
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly
    this.throwOnShaderError = false;
    this.lightingModel = HX.BlinnPhongSimpleLightingModel;

    // will be assigned to HX.DirectionalLight.SHADOW_FILTER
    this.directionalShadowFilter = new HX.HardDirectionalShadowFilter();
};

/**
 * ShaderLibrary is an object that will store shader code processed by the build process: contents of glsl files stored
 * in the glsl folder will be stored here and can be retrieved using their original filename.
 */
HX.ShaderLibrary = {
    /**
     * Retrieves the shader code for a given filename.
     * @param filename The filename of the glsl code to retrieve
     * @param defines (Optional) An object containing variable names that need to be defined with the given value.
     * This should not be used for macros, which should be explicitly prepended
     * @param extensions (Optional) An array of extensions to be required
     * @returns A string containing the shader code from the files with defines prepended
     */
    get: function(filename, defines, extensions)
    {
        var defineString = "";

        if (extensions) {
            for (var i = 0; i < extensions.length; ++i) {
                defineString += "#extension " + extensions[i] + " : require\n";
            }
        }

        for (var key in defines) {
            if (defines.hasOwnProperty(key)) {
                defineString += "#define " + key + " " + defines[key] + "\n";
            }
        }

        return defineString + HX.ShaderLibrary[filename];
    }
};

/**
 * Initializes Helix and creates a WebGL context from a given canvas
 * @param canvas The canvas to create the gl context from.
 */
HX.init = function(canvas, options)
{
    if (HX.INITIALIZED) throw new Error("Can only initialize Helix once!");


    HX.TARGET_CANVAS = canvas;

    var webglFlags = {
        antialias:false,
        alpha:false,
        depth:false,
        stencil:false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
    };

    var glContext = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    if (options && options.debug) {
        // ugly, but prevents having to include the webgl-debug.js file
        eval("glContext = WebGLDebugUtils.makeDebugContext(glContext)");
    }

    HX.OPTIONS = options || new HX.InitOptions();
    HX_GL = glContext;

    if (!HX_GL) throw new Error("WebGL not supported");

    HX.INITIALIZED = true;

    var extensions  = HX_GL.getSupportedExtensions();

    function _getExtension(name)
    {
        return extensions.indexOf(name) >= 0 ? HX_GL.getExtension(name) : null;
    }

    // shortcuts
    HX._initGLProperties();

    HX._initLights();
    HX.LIGHTING_MODEL = HX.OPTIONS.lightingModel;
    HX.DirectionalLight.SHADOW_FILTER = HX.OPTIONS.directionalShadowFilter;

    HX.GLSLIncludeGeometryPass = "\n" + HX.DirectionalLight.SHADOW_FILTER.getGLSL() + HX.GLSLIncludeGeometryPass;

    var defines = "";
    if (HX.OPTIONS.useGammaCorrection !== false)
        defines += HX.OPTIONS.usePreciseGammaCorrection? "#define HX_GAMMA_CORRECTION_PRECISE\n" : "#define HX_GAMMA_CORRECTION_FAST\n";

    defines += "#define HX_MAX_BONES " + HX.OPTIONS.maxBones + "\n";

    HX.OPTIONS.ignoreDrawBuffersExtension = HX.OPTIONS.ignoreDrawBuffersExtension || HX.OPTIONS.ignoreAllExtensions;
    HX.OPTIONS.ignoreDepthTexturesExtension = HX.OPTIONS.ignoreDepthTexturesExtension || HX.OPTIONS.ignoreAllExtensions;
    HX.OPTIONS.ignoreTextureLODExtension = HX.OPTIONS.ignoreTextureLODExtension || HX.OPTIONS.ignoreAllExtensions;
    HX.OPTIONS.ignoreHalfFloatTextureExtension = HX.OPTIONS.ignoreHalfFloatTextureExtension || HX.OPTIONS.ignoreAllExtensions;

    if (!HX.OPTIONS.ignoreDrawBuffersExtension)
        HX.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');

    if (HX.EXT_DRAW_BUFFERS && HX.EXT_DRAW_BUFFERS.MAX_DRAW_BUFFERS_WEBGL >= 3) {
        defines += "#extension GL_EXT_draw_buffers : require\n";
    }
    else {
        defines += "#define HX_SEPARATE_GEOMETRY_PASSES\n";
        console.warn('WEBGL_draw_buffers extension not supported!');
        HX.EXT_DRAW_BUFFERS = null;
    }

    HX.EXT_FLOAT_TEXTURES = _getExtension('OES_texture_float');
    if (!HX.EXT_FLOAT_TEXTURES) console.warn('OES_texture_float extension not supported!');

    if (!HX.OPTIONS.ignoreHalfFloatTextureExtension)
        HX.EXT_HALF_FLOAT_TEXTURES = _getExtension('OES_texture_half_float');
    if (!HX.EXT_HALF_FLOAT_TEXTURES) console.warn('OES_texture_half_float extension not supported!');

    HX.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
    if (!HX.EXT_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_float_linear extension not supported!');

    HX.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');
    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_half_float_linear extension not supported!');

    // these SHOULD be implemented, but are not by Chrome
    //HX.EXT_COLOR_BUFFER_FLOAT = _getExtension('WEBGL_color_buffer_float');
    //if (!HX.EXT_COLOR_BUFFER_FLOAT) console.warn('WEBGL_color_buffer_float extension not supported!');

    //HX.EXT_COLOR_BUFFER_HALF_FLOAT = _getExtension('EXT_color_buffer_half_float');
    //if (!HX.EXT_COLOR_BUFFER_HALF_FLOAT) console.warn('EXT_color_buffer_half_float extension not supported!');

    if (!HX.OPTIONS.ignoreDepthTexturesExtension)
        HX.EXT_DEPTH_TEXTURE = _getExtension('WEBGL_depth_texture');

    if (!HX.EXT_DEPTH_TEXTURE) {
        console.warn('WEBGL_depth_texture extension not supported!');
        defines += "#define HX_NO_DEPTH_TEXTURES\n";
    }

    HX.EXT_STANDARD_DERIVATIVES = _getExtension('OES_standard_derivatives');
    if (!HX.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    if (!HX.OPTIONS.ignoreTextureLODExtension)
        HX.EXT_SHADER_TEXTURE_LOD = _getExtension('EXT_shader_texture_lod');

    if (!HX.EXT_SHADER_TEXTURE_LOD) console.warn('EXT_shader_texture_lod extension not supported!');

    HX.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    if (!HX.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    //HX.EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!HX.EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    HX.DEFAULT_TEXTURE_MAX_ANISOTROPY = HX.EXT_TEXTURE_FILTER_ANISOTROPIC? HX_GL.getParameter(HX.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR || !HX.EXT_HALF_FLOAT_TEXTURES)
        HX.OPTIONS.useHDR = false;

    HX.HDR_FORMAT = HX.OPTIONS.useHDR? HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : HX_GL.UNSIGNED_BYTE;

    HX.GAMMA_CORRECTION_IN_LIGHTS = false;

    // this causes lighting accumulation to happen in gamma space (only accumulation of lights within the same pass is linear)
    // This yields an incorrect gamma correction to be applied, but looks much better due to encoding limitation (otherwise there would be banding)
    if (HX.OPTIONS.useGammaCorrection && !HX.OPTIONS.useHDR) {
        HX.GAMMA_CORRECT_LIGHTS = true;
        defines += "#define HX_GAMMA_CORRECT_LIGHTS\n";
    }

    // include individual geometry shaders
    if (!HX.EXT_DRAW_BUFFERS)
        HX.MaterialPass.NUM_PASS_TYPES += !!HX.EXT_DEPTH_TEXTURE? 2 : 3;

    HX.MaterialPass.SHADOW_DEPTH_PASS = HX.MaterialPass.NUM_PASS_TYPES - 1;

    HX.GLSLIncludeGeneral = defines + HX.GLSLIncludeGeneral;

    HX.Texture2D._initDefault();
    HX.TextureCube._initDefault();
    HX.BlendState._initDefaults();
    HX.RectMesh._initDefault();
    HX.PoissonDisk._initDefault();
    HX.PoissonSphere._initDefault();

    HX._init2DDitherTexture(32, 32);

    HX.setClearColor(HX.Color.BLACK);

    HX.onPreFrame = new HX.Signal();  // for engine-specific stuff (entity updates etc), stats updates, etc
    HX.onFrame = new HX.Signal();   // for user-implemented behaviour and rendering

    HX.FRAME_TICKER = new HX.FrameTicker();
    HX.start();
};

HX.start = function()
{
    HX.FRAME_TICKER.start(function(dt) {
        HX.onPreFrame.dispatch(dt);
        HX.onFrame.dispatch(dt);
    });
};

HX.stop = function()
{
    HX.FRAME_TICKER.stop();
};

HX._initLights = function()
{
    HX.LIGHT_TYPES = [ HX.AmbientLight, HX.DirectionalLight, HX.PointLight ].concat(HX.OPTIONS.customLights);

    for (var i = 0; i < HX.LIGHT_TYPES.length; ++i) {
        var type = HX.LIGHT_TYPES[i];
        var closure = function() {
            var j = i;
            return function() { return j; }
        };

        type.prototype.getTypeID = closure();
    }
};

HX._init2DDitherTexture = function(width, height)
{
    HX.DEFAULT_2D_DITHER_TEXTURE = new HX.Texture2D();
    var len = width * height;
    var minValue = 1.0 / len;
    var data = [];
    var k = 0;
    var values = [];

    for (var i = 0; i < len; ++i) {
        values.push(i / len);
    }

    HX.shuffle(values);

    for (var i = 0; i < len; ++i) {
        var angle = values[i] * Math.PI * 2.0;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        // store rotation matrix
        // RGBA:
        data[k++] = cos;
        data[k++] = sin;
        data[k++] = minValue + values[i];
        data[k++] = 1.0;
    }

    HX.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, HX_GL.RGBA, HX_GL.FLOAT);
    HX.DEFAULT_2D_DITHER_TEXTURE.filter = HX.TextureFilter.NEAREST_NOMIP;
    HX.DEFAULT_2D_DITHER_TEXTURE.wrapMode = HX.TextureWrapMode.REPEAT;
};


HX._initGLProperties = function()
{
    HX.TextureFilter = {};
    HX.TextureFilter.NEAREST = {min: HX_GL.NEAREST_MIPMAP_NEAREST, mag: HX_GL.NEAREST};
    HX.TextureFilter.BILINEAR = {min: HX_GL.LINEAR_MIPMAP_NEAREST, mag: HX_GL.LINEAR};
    HX.TextureFilter.TRILINEAR = {min: HX_GL.LINEAR_MIPMAP_LINEAR, mag: HX_GL.LINEAR};

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
        HX.TextureFilter.TRILINEAR_ANISOTROPIC = {min: HX_GL.LINEAR_MIPMAP_LINEAR, mag: HX_GL.LINEAR};


    HX.TextureFilter.NEAREST_NOMIP = { min: HX_GL.NEAREST, mag: HX_GL.NEAREST };
    HX.TextureFilter.BILINEAR_NOMIP = { min: HX_GL.LINEAR, mag: HX_GL.LINEAR };

    HX.TextureWrapMode = {};
    HX.TextureWrapMode.REPEAT = { s: HX_GL.REPEAT, t: HX_GL.REPEAT };
    HX.TextureWrapMode.CLAMP = { s: HX_GL.CLAMP_TO_EDGE, t: HX_GL.CLAMP_TO_EDGE };

    // default settings:
    HX.TextureWrapMode.DEFAULT = HX.TextureWrapMode.REPEAT;
    HX.TextureFilter.DEFAULT = HX.TextureFilter.TRILINEAR;

    HX.CullMode = {
        NONE: null,
        BACK: HX_GL.BACK,
        FRONT: HX_GL.FRONT,
        ALL: HX_GL.FRONT_AND_BACK
    };

    HX.StencilOp = {
        KEEP: HX_GL.KEEP,
        ZERO: HX_GL.ZERO,
        REPLACE: HX_GL.REPLACE,
        INCREMENT: HX_GL.INCR,
        INCREMENT_WRAP: HX_GL.INCR_WRAP,
        DECREMENT: HX_GL.DECR,
        DECREMENT_WRAP: HX_GL.DECR_WRAP,
        INVERT: HX_GL.INVERT
    };

    HX.Comparison = {
        DISABLED: null,
        ALWAYS: HX_GL.ALWAYS,
        NEVER: HX_GL.NEVER,
        LESS: HX_GL.LESS,
        EQUAL: HX_GL.EQUAL,
        LESS_EQUAL: HX_GL.LEQUAL,
        GREATER: HX_GL.GREATER,
        NOT_EQUAL: HX_GL.NOTEQUAL,
        GREATER_EQUAL: HX_GL.GEQUAL
    };

    HX.ElementType = {
        POINTS: HX_GL.POINTS,
        LINES: HX_GL.LINES,
        LINE_STRIP: HX_GL.LINE_STRIP,
        LINE_LOOP: HX_GL.LINE_LOOP,
        TRIANGLES: HX_GL.TRIANGLES,
        TRIANGLE_STRIP: HX_GL.TRIANGLE_STRIP,
        TRIANGLE_FAN: HX_GL.TRIANGLE_FAN
    };

    HX.BlendFactor = {
        ZERO: HX_GL.ZERO,
        ONE: HX_GL.ONE,
        SOURCE_COLOR: HX_GL.SRC_COLOR,
        ONE_MINUS_SOURCE_COLOR: HX_GL.ONE_MINUS_SRC_COLOR,
        DESTINATION_COLOR: HX_GL.DST_COLOR,
        ONE_MINUS_DESTINATION_COLOR: HX_GL.ONE_MINUS_DST_COLOR,
        SOURCE_ALPHA: HX_GL.SRC_ALPHA,
        ONE_MINUS_SOURCE_ALPHA: HX_GL.ONE_MINUS_SRC_ALPHA,
        DESTINATION_ALPHA: HX_GL.DST_ALPHA,
        ONE_MINUS_DESTINATION_ALPHA: HX_GL.ONE_MINUS_DST_ALPHA,
        SOURCE_ALPHA_SATURATE: HX_GL.SRC_ALPHA_SATURATE,
        CONSTANT_ALPHA: HX_GL.CONSTANT_ALPHA,
        ONE_MINUS_CONSTANT_ALPHA: HX_GL.ONE_MINUS_CONSTANT_ALPHA
    };

    HX.BlendOperation = {
        ADD: HX_GL.FUNC_ADD,
        SUBTRACT: HX_GL.FUNC_SUBTRACT,
        REVERSE_SUBTRACT: HX_GL.FUNC_REVERSE_SUBTRACT
    };

    HX.COMPLETE_CLEAR_MASK = HX_GL.COLOR_BUFFER_BIT | HX_GL.DEPTH_BUFFER_BIT | HX_GL.STENCIL_BUFFER_BIT;
};
HX.ShaderLibrary['debug_bounds_fragment.glsl'] = 'uniform vec4 color;\n\nvoid main()\n{\n    gl_FragColor = color;\n}';

HX.ShaderLibrary['debug_bounds_vertex.glsl'] = 'attribute vec4 hx_position;\n\nuniform mat4 hx_wvpMatrix;\n\nvoid main()\n{\n    gl_Position = hx_wvpMatrix * hx_position;\n}';

HX.ShaderLibrary['lighting_blinn_phong.glsl'] = '/*float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n    float roughSqr = roughness*roughness;\n    float g1 = nDotV + sqrt( roughSqr + (1.0 - roughSqr) * nDotV * nDotV );\n    float g2 = nDotL + sqrt( roughSqr + (1.0 - roughSqr) * nDotL * nDotL );\n    return 1.0 / (g1 * g2);\n}*/\n\n// schlick-beckman\nfloat hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	float r = roughness * roughness * 0.797896;\n	float g1 = nDotV * (1.0 - r) + r;\n	float g2 = nDotL * (1.0 - r) + r;\n    return .25 / (g1 * g2);\n}\n\nfloat hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)\n{\n	float roughnessSqr = clamp(roughness * roughness, 0.0001, .9999);\n//	roughnessSqr *= roughnessSqr;\n	float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n	return pow(halfDotNormal, 2.0/roughnessSqr - 2.0) / roughnessSqr;\n}\n\nvoid hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	float distribution = hx_blinnPhongDistribution(roughness, normal, halfVector);\n\n	float halfDotLight = dot(halfVector, lightDir);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	float power = cosAngle*cosAngle;\n	power *= power;\n	power *= cosAngle;\n	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\n// / PI factor is encoded in light colour\n	//approximated fresnel-based energy conservation\n	diffuseColor = irradiance;\n\n	specularColor = irradiance * fresnel * distribution;\n\n#ifdef VISIBILITY\n    specularColor *= hx_lightVisibility(normal, lightDir, roughness, nDotL);\n#endif\n}';

HX.ShaderLibrary['lighting_ggx.glsl'] = '// Smith:\n/*float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	float roughSqr = roughness*roughness;\n	float g1 = nDotV + sqrt( (nDotV - nDotV * roughSqr) * nDotV + roughSqr );\n    float g2 = nDotL + sqrt( (nDotL - nDotL * roughSqr) * nDotL + roughSqr );\n    return 1.0 / (g1 * g2);\n}*/\n\n// schlick-beckman\nfloat hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	float r = roughness * roughness * 0.797896;\n	float g1 = nDotV * (1.0 - r) + r;\n	float g2 = nDotL * (1.0 - r) + r;\n    return .25 / (g1 * g2);\n}\n\nfloat hx_ggxDistribution(float roughness, vec3 normal, vec3 halfVector)\n{\n    float roughSqr = roughness*roughness;\n    float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n    float denom = (halfDotNormal * halfDotNormal) * (roughSqr - 1.0) + 1.0;\n    return roughSqr / (denom * denom);\n}\n\nvoid hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	float distribution = hx_ggxDistribution(roughness, normal, halfVector);\n\n	float halfDotLight = dot(halfVector, lightDir);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	float power = cosAngle*cosAngle;\n	power *= power;\n	power *= cosAngle;\n	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\n	//approximated fresnel-based energy conservation\n	diffuseColor = irradiance;\n\n	specularColor = irradiance * fresnel * distribution;\n\n#ifdef VISIBILITY\n    specularColor *= hx_lightVisibility(normal, lightDir, roughness, nDotL);\n#endif\n}';

HX.ShaderLibrary['directional_light_fragment.glsl'] = 'uniform vec3 lightColor;\nuniform vec3 lightViewDirection;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n\n#ifdef CAST_SHADOWS\n	uniform sampler2D hx_gbufferDepth;\n	uniform sampler2D shadowMap;\n\n	uniform float hx_cameraFrustumRange;\n	uniform float hx_cameraNearPlaneDistance;\n\n	uniform mat4 shadowMapMatrices[NUM_CASCADES];\n	uniform float splitDistances[NUM_CASCADES];\n	uniform float depthBias;\n\n\n    mat4 getShadowMatrix(vec3 viewPos)\n    {\n        #if NUM_CASCADES > 1\n            // not very efficient :(\n            for (int i = 0; i < NUM_CASCADES - 1; ++i) {\n                // remember, negative Z!\n                if (viewPos.z > splitDistances[i]) {\n                    return shadowMapMatrices[i];\n                }\n            }\n            return shadowMapMatrices[NUM_CASCADES - 1];\n        #else\n            return shadowMapMatrices[0];\n        #endif\n    }\n#endif\n\nvec3 hx_calculateLight(vec3 diffuseAlbedo, vec3 normal, vec3 lightDir, vec3 viewVector, vec3 normalSpecularReflectance, float roughness, float metallicness)\n{\n// start extractable code (for fwd)\n	vec3 diffuseReflection;\n	vec3 specularReflection;\n\n	hx_lighting(normal, lightDir, normalize(viewVector), lightColor, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);\n\n	diffuseReflection *= diffuseAlbedo * (1.0 - metallicness);\n	vec3 totalReflection = diffuseReflection + specularReflection;\n\n	#ifdef CAST_SHADOWS\n		float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n		float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n		vec3 viewPos = viewZ * viewVector;\n		mat4 shadowMatrix = getShadowMatrix(viewPos);\n		float shadow = hx_getShadow(shadowMap, viewPos, shadowMatrix, depthBias, uv);\n//		#if NUM_CASCADES > 1\n		// should not cast shadows past the cutoff point\n		shadow = max(shadow, float(viewPos.z < splitDistances[NUM_CASCADES - 1]));\n//		#endif\n		totalReflection *= shadow;\n	#endif\n\n    return totalReflection;\n}\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = hx_decodeNormal(normalSample);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n\n	vec3 totalReflection = hx_calculateLight(colorSample.xyz, normal, lightViewDirection, viewDir, normalSpecularReflectance, roughness, metallicness);\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        totalReflection = hx_linearToGamma(totalReflection);\n    #endif\n\n	gl_FragColor = vec4(totalReflection, 1.0);\n\n}';

HX.ShaderLibrary['directional_light_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['global_irradiance_probe_fragment.glsl'] = 'varying vec3 viewWorldDir;\nvarying vec2 uv;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n\nuniform samplerCube irradianceProbeSampler;\n\nuniform mat4 hx_cameraWorldMatrix;\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\n	vec3 normal = mat3(hx_cameraWorldMatrix) * hx_decodeNormal(normalSample);\n	vec3 totalLight = vec3(0.0);\n\n	vec4 irradianceSample = textureCube(irradianceProbeSampler, normal);\n	irradianceSample = hx_gammaToLinear(irradianceSample);\n	irradianceSample.xyz *= (1.0 - specularSample.z);\n	totalLight += irradianceSample.xyz * colorSample.xyz;\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        totalLight = hx_linearToGamma(totalLight);\n    #endif\n\n	gl_FragColor = vec4(totalLight, 1.0);\n}';

HX.ShaderLibrary['global_irradiance_probe_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\nvarying vec2 uv;\n\n// using rect mesh for rendering skyboxes!\nvoid main()\n{\n	vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n	viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n	viewWorldDir.y = viewWorldDir.y;\n	vec4 pos = hx_position;\n	pos.z = 1.0;\n	gl_Position = pos;\n	uv = hx_texCoord;\n}';

HX.ShaderLibrary['global_specular_probe_fragment.glsl'] = 'varying vec3 viewWorldDir;\nvarying vec2 uv;\n\nuniform samplerCube specularProbeSampler;\nuniform float numMips;\nuniform float mipOffset;\nuniform float maxMipFactor;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n\nuniform mat4 hx_cameraWorldMatrix;\n\n// this is Schlick-Beckmann attenuation for only the view vector\nfloat hx_geometricShadowing(vec3 normal, vec3 reflection, float roughness)\n{\n    float nDotV = max(dot(normal, reflection), 0.0);\n    float att = nDotV / (nDotV * (1.0 - roughness) + roughness);\n    return att;\n}\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = mat3(hx_cameraWorldMatrix) * hx_decodeNormal(normalSample);\n	vec3 totalLight = vec3(0.0);\n\n	vec3 reflectedViewDir = reflect(normalize(viewWorldDir), normal);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n	#ifdef USE_TEX_LOD\n	// knald method:\n		float power = 2.0/(roughness * roughness) - 2.0;\n		float factor = (exp2(-10.0/sqrt(power)) - K0)/K1;\n		float mipLevel = numMips*(1.0 - clamp(factor/maxMipFactor, 0.0, 1.0));\n		vec4 specProbeSample = textureCubeLodEXT(specularProbeSampler, reflectedViewDir, mipLevel);\n	#else\n		vec4 specProbeSample = textureCube(specularProbeSampler, reflectedViewDir);\n	#endif\n	specProbeSample = hx_gammaToLinear(specProbeSample);\n	vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflectedViewDir, normal);\n	float attenuation = mix(hx_geometricShadowing(normal, reflectedViewDir, roughness), 1.0, metallicness);\n\n	totalLight += fresnel * attenuation * specProbeSample.xyz;\n\n	#ifdef HX_GAMMA_CORRECT_LIGHTS\n        totalLight = hx_linearToGamma(totalLight);\n    #endif\n\n	gl_FragColor = vec4(totalLight, 1.0);\n}';

HX.ShaderLibrary['global_specular_probe_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\nvarying vec2 uv;\n\nvoid main()\n{\n	vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n	viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n	viewWorldDir.y = viewWorldDir.y;\n	vec4 pos = hx_position;\n	pos.z = 1.0;\n	gl_Position = pos;\n	uv = hx_texCoord;\n}';

HX.ShaderLibrary['point_light_fragment.glsl'] = 'varying vec3 viewDir;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\nuniform sampler2D hx_gbufferDepth;\n\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec2 hx_rcpRenderTargetResolution;\n\nvarying vec3 lightColorVar;\nvarying vec3 lightPositionVar;\nvarying float lightRadiusVar;\nvoid main()\n{\n    vec2 uv = gl_FragCoord.xy * hx_rcpRenderTargetResolution;\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = hx_decodeNormal(normalSample);\n	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n\n	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n	vec3 viewPosition = absViewZ * viewDir;\n\n	vec3 viewDirNorm = normalize(viewDir);\n\n	vec3 diffuseReflection;\n	vec3 specularReflection;\n\n	vec3 lightViewDirection = viewPosition - lightPositionVar;\n	float attenuation = dot(lightViewDirection, lightViewDirection);\n	float distance = sqrt(attenuation);\n	// normalize:\n	lightViewDirection /= distance;\n\n	// rescale attenuation so that irradiance at bounding edge really is 0\n	attenuation = max(1.0 / attenuation * (1.0 - distance / lightRadiusVar), 0.0);\n	hx_lighting(normal, lightViewDirection, viewDirNorm, lightColorVar * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);\n\n	diffuseReflection *= colorSample.xyz * (1.0 - metallicness);\n	vec3 totalLight = diffuseReflection + specularReflection;\n	#ifdef HX_GAMMA_CORRECT_LIGHTS\n	    totalLight = hx_linearToGamma(totalLight);\n	#endif\n	gl_FragColor = vec4(totalLight, 1.0);\n}';

HX.ShaderLibrary['point_light_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute float hx_instanceID;\n\nuniform mat4 hx_viewMatrix;\nuniform mat4 hx_cameraWorldMatrix;\nuniform mat4 hx_projectionMatrix;\n\nuniform vec3 lightViewPosition[LIGHTS_PER_BATCH];\nuniform vec3 lightColor[LIGHTS_PER_BATCH];\nuniform float lightRadius[LIGHTS_PER_BATCH];\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 lightColorVar;\nvarying vec3 lightPositionVar;\nvarying float lightRadiusVar;\n\nvoid main()\n{\n	int instance = int(hx_instanceID);\n	lightPositionVar = lightViewPosition[instance];\n	lightColorVar = lightColor[instance];\n	lightRadiusVar = lightRadius[instance];\n	vec3 viewPos = mat3(hx_viewMatrix) * (hx_position.xyz * lightRadius[instance]) + lightPositionVar;\n	vec4 proj = hx_projectionMatrix * vec4(viewPos, 1.0);\n\n	viewDir = -viewPos / viewPos.z;\n\n	gl_Position = proj;\n}';

HX.ShaderLibrary['default_geometry_mrt_fragment.glsl'] = 'varying vec3 normal;\n\nuniform vec3 color;\nuniform float alpha;\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)\nvarying vec2 texCoords;\n#endif\n\n#ifdef COLOR_MAP\nuniform sampler2D colorMap;\n#endif\n\n#ifdef MASK_MAP\nuniform sampler2D maskMap;\n#endif\n\n#ifdef NORMAL_MAP\nvarying vec3 tangent;\nvarying vec3 bitangent;\n\nuniform sampler2D normalMap;\n#endif\n\nuniform float hx_transparencyMode;\nuniform float minRoughness;\nuniform float maxRoughness;\nuniform float specularNormalReflection;\nuniform float metallicness;\n\n#if defined(ALPHA_THRESHOLD)\nuniform float alphaThreshold;\n#endif\n\n#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)\nuniform sampler2D specularMap;\n#endif\n\n#ifdef VERTEX_COLORS\nvarying vec3 vertexColor;\n#endif\n\nvarying float linearDepth;\n\nvoid main()\n{\n    vec4 outputColor = vec4(color, alpha);\n\n    #ifdef VERTEX_COLORS\n        outputColor.xyz *= vertexColor;\n    #endif\n\n    #ifdef COLOR_MAP\n        outputColor *= texture2D(colorMap, texCoords);\n    #endif\n\n    #ifdef MASK_MAP\n        outputColor.w *= texture2D(maskMap, texCoords).x;\n    #endif\n\n    #ifdef ALPHA_THRESHOLD\n        if (outputColor.w < alphaThreshold) discard;\n    #endif\n\n    float metallicnessOut = metallicness;\n    float specNormalReflOut = specularNormalReflection;\n    float roughnessOut = minRoughness;\n\n    vec3 fragNormal = normal;\n    #ifdef NORMAL_MAP\n        vec4 normalSample = texture2D(normalMap, texCoords);\n        mat3 TBN;\n        TBN[2] = normalize(normal);\n        TBN[0] = normalize(tangent);\n        TBN[1] = normalize(bitangent);\n\n        fragNormal = TBN * (normalSample.xyz * 2.0 - 1.0);\n\n        #ifdef NORMAL_ROUGHNESS_MAP\n            roughnessOut = maxRoughness + (minRoughness - maxRoughness) * normalSample.w;\n        #endif\n    #endif\n\n    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)\n          vec4 specSample = texture2D(specularMap, texCoords);\n          roughnessOut = maxRoughness + (minRoughness - maxRoughness) * specSample.x;\n\n          #ifdef SPECULAR_MAP\n              specNormalReflOut *= specSample.y;\n              metallicnessOut *= specSample.z;\n          #endif\n    #endif\n\n    GeometryData data;\n    data.color = hx_gammaToLinear(outputColor);\n    data.normal = fragNormal;\n    data.metallicness = metallicnessOut;\n    data.specularNormalReflection = specNormalReflOut;\n    data.roughness = roughnessOut;\n    data.emission = 0.0;\n    data.transparencyMode = hx_transparencyMode;\n    data.linearDepth = linearDepth;\n    hx_processGeometry(data);\n}';

HX.ShaderLibrary['default_geometry_mrt_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec3 hx_normal;\n\n#ifdef USE_SKINNING\nattribute vec4 hx_boneIndices;\nattribute vec4 hx_boneWeights;\n\n// WebGL doesn\'t support mat4x3 and I don\'t want to split the uniform either\nuniform mat4 hx_skinningMatrices[HX_MAX_BONES];\n#endif\n\nuniform mat4 hx_wvpMatrix;\nuniform mat3 hx_normalWorldViewMatrix;\nuniform mat4 hx_worldViewMatrix;\n\nvarying vec3 normal;\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)\nattribute vec2 hx_texCoord;\nvarying vec2 texCoords;\n#endif\n\n#ifdef VERTEX_COLORS\nattribute vec3 hx_vertexColor;\nvarying vec3 vertexColor;\n#endif\n\n#ifdef NORMAL_MAP\nattribute vec4 hx_tangent;\n\nvarying vec3 tangent;\nvarying vec3 bitangent;\n#endif\n\nvarying float linearDepth;\n\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_rcpCameraFrustumRange;\n\nvoid main()\n{\n#ifdef USE_SKINNING\n    mat4 skinningMatrix = hx_boneWeights.x * hx_skinningMatrices[int(hx_boneIndices.x)];\n    skinningMatrix += hx_boneWeights.y * hx_skinningMatrices[int(hx_boneIndices.y)];\n    skinningMatrix += hx_boneWeights.z * hx_skinningMatrices[int(hx_boneIndices.z)];\n    skinningMatrix += hx_boneWeights.w * hx_skinningMatrices[int(hx_boneIndices.w)];\n\n    vec4 animPosition = skinningMatrix * hx_position;\n    vec3 animNormal = mat3(skinningMatrix) * hx_normal;\n\n    #ifdef NORMAL_MAP\n    vec3 animTangent = mat3(skinningMatrix) * hx_tangent.xyz;\n    #endif\n#else\n    vec4 animPosition = hx_position;\n    vec3 animNormal = hx_normal;\n\n    #ifdef NORMAL_MAP\n    vec3 animTangent = hx_tangent.xyz;\n    #endif\n#endif\n\n    gl_Position = hx_wvpMatrix * animPosition;\n    normal = normalize(hx_normalWorldViewMatrix * animNormal);\n\n#ifdef NORMAL_MAP\n    tangent = mat3(hx_worldViewMatrix) * animTangent;\n    bitangent = cross(tangent, normal) * hx_tangent.w;\n#endif\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)\n    texCoords = hx_texCoord;\n#endif\n\n    linearDepth = (-(hx_worldViewMatrix * animPosition).z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;\n\n#ifdef VERTEX_COLORS\n    vertexColor = hx_vertexColor;\n#endif\n}';

HX.ShaderLibrary['default_skybox_fragment.glsl'] = 'varying vec3 viewWorldDir;\n\nuniform samplerCube hx_skybox;\n\nvoid main()\n{\n    GeometryData data;\n    data.color = hx_gammaToLinear(textureCube(hx_skybox, viewWorldDir));\n    data.emission = 1.0;\n    data.transparencyMode = HX_TRANSPARENCY_OPAQUE;\n    data.linearDepth = 1.0;\n    hx_processGeometry(data);\n}';

HX.ShaderLibrary['default_skybox_vertex.glsl'] = 'attribute vec4 hx_position;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\n\n// using 2D quad for rendering skyboxes rather than 3D cube\nvoid main()\n{\n    vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n    viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n    gl_Position = vec4(hx_position.xy, 1.0, 1.0);  // make sure it\'s drawn behind everything else, so z = 1.0\n}';

HX.ShaderLibrary['bloom_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sourceTexture;\n\nuniform float gaussianWeights[NUM_SAMPLES];\n\nvoid main()\n{\n	vec4 total = vec4(0.0);\n	vec2 sampleUV = uv;\n	vec2 stepSize = DIRECTION / SOURCE_RES;\n	float totalWeight = 0.0;\n	for (int i = 0; i < NUM_SAMPLES; ++i) {\n		total += texture2D(sourceTexture, sampleUV) * gaussianWeights[i];\n		sampleUV += stepSize;\n	}\n	gl_FragColor = total;\n}';

HX.ShaderLibrary['bloom_blur_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord - RADIUS * DIRECTION / SOURCE_RES;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['bloom_composite_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D bloomTexture;\nuniform float strength;\n\nvoid main()\n{\n	gl_FragColor = texture2D(bloomTexture, uv) * strength;\n}';

HX.ShaderLibrary['bloom_composite_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	   uv = hx_texCoord;\n	   gl_Position = hx_position;\n}';

HX.ShaderLibrary['bloom_threshold_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_frontbuffer;\n\nuniform float threshold;\n\nvoid main()\n{\n        vec4 color = texture2D(hx_frontbuffer, uv);\n        float originalLuminance = .05 + hx_luminance(color);\n        float targetLuminance = max(originalLuminance - threshold, 0.0);\n        gl_FragColor = color * targetLuminance / originalLuminance;\n}\n';

HX.ShaderLibrary['default_post_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['fog_fragment.glsl'] = 'varying vec2 uv;\n\nuniform vec3 tint;\nuniform float density;\nuniform float startDistance;\n\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\n\nuniform sampler2D hx_gbufferDepth;\n\nvoid main()\n{\n	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n	// do not fog up skybox\n	// this might actually solve itself due to depth map encoding\n	if (depth > .999) depth = 0.0;\n	float distance = depth * hx_cameraFrustumRange;\n\n\n	distance -= startDistance;\n\n	float fog = clamp(exp2(-distance * density), 0.0, 1.0);\n	gl_FragColor = vec4(tint, fog);\n}';

HX.ShaderLibrary['fxaa_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_backbuffer;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform float edgeThreshold;\nuniform float edgeThresholdMin;\nuniform float edgeSharpness;\n\nfloat luminanceHint(vec4 color)\n{\n	return .30/.59 * color.r + color.g;\n}\n\nvoid main()\n{\n	vec4 center = texture2D(hx_backbuffer, uv);\n	vec2 halfRes = vec2(hx_rcpRenderTargetResolution.x, hx_rcpRenderTargetResolution.y) * .5;\n	float topLeftLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(-halfRes.x, halfRes.y)));\n	float bottomLeftLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(-halfRes.x, -halfRes.y)));\n	float topRightLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(halfRes.x, halfRes.y)));\n	float bottomRightLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(halfRes.x, -halfRes.y)));\n\n	float centerLum = luminanceHint(center);\n	float minLum = min(min(topLeftLum, bottomLeftLum), min(topRightLum, bottomRightLum));\n	float maxLum = max(max(topLeftLum, bottomLeftLum), max(topRightLum, bottomRightLum));\n	float range = max(centerLum, maxLum) - min(centerLum, minLum);\n	float threshold = max(edgeThresholdMin, maxLum * edgeThreshold);\n	float applyFXAA = range < threshold? 0.0 : 1.0;\n\n	float diagDiff1 = bottomLeftLum - topRightLum;\n	float diagDiff2 = bottomRightLum - topLeftLum;\n	vec2 dir1 = normalize(vec2(diagDiff1 + diagDiff2, diagDiff1 - diagDiff2));\n	vec4 sampleNeg1 = texture2D(hx_backbuffer, uv - halfRes * dir1);\n	vec4 samplePos1 = texture2D(hx_backbuffer, uv + halfRes * dir1);\n\n	float minComp = min(abs(dir1.x), abs(dir1.y)) * edgeSharpness;\n	vec2 dir2 = clamp(dir1.xy / minComp, -2.0, 2.0) * 2.0;\n	vec4 sampleNeg2 = texture2D(hx_backbuffer, uv - hx_rcpRenderTargetResolution * dir2);\n	vec4 samplePos2 = texture2D(hx_backbuffer, uv + hx_rcpRenderTargetResolution * dir2);\n	vec4 tap1 = sampleNeg1 + samplePos1;\n	vec4 fxaa = (tap1 + sampleNeg2 + samplePos2) * .25;\n	float fxaaLum = luminanceHint(fxaa);\n	if ((fxaaLum < minLum) || (fxaaLum > maxLum))\n		fxaa = tap1 * .5;\n	gl_FragColor = mix(center, fxaa, applyFXAA);\n}';

HX.ShaderLibrary['ssr_fragment.glsl'] = '#extension GL_OES_standard_derivatives : enable\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D hx_dither2D;\nuniform vec2 hx_renderTargetResolution;\n\nuniform sampler2D hx_frontbuffer;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform vec2 ditherTextureScale;\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\nuniform float hx_rcpCameraFrustumRange;\nuniform mat4 hx_projectionMatrix;\n\nuniform float maxDistance;\nuniform float stepSize;\nuniform float maxRoughness;\n\n// all in viewspace\n// 0 is start, 1 is end\nfloat raytrace(in vec3 ray0, in vec3 rayDir, out float hitZ, out vec2 hitUV)\n{\n    vec4 dither = texture2D(hx_dither2D, uv * ditherTextureScale);\n    // Clip to the near plane\n	float rayLength = ((ray0.z + rayDir.z * maxDistance) > -hx_cameraNearPlaneDistance) ?\n						(-hx_cameraNearPlaneDistance - ray0.z) / rayDir.z : maxDistance;\n\n    vec3 ray1 = ray0 + rayDir * rayLength;\n\n    // only need the w component for perspective correct interpolation\n    // need to get adjusted ray end\'s uv value\n    vec4 hom0 = hx_projectionMatrix * vec4(ray0, 1.0);\n    vec4 hom1 = hx_projectionMatrix * vec4(ray1, 1.0);\n    float rcpW0 = 1.0 / hom0.w;\n    float rcpW1 = 1.0 / hom1.w;\n\n    hom0 *= rcpW0;\n    hom1 *= rcpW1;\n\n    // expressed in pixels, so we can snap to 1\n    // need to figure out the ratio between 1 pixel and the entire line \"width\" (if primarily vertical, it\'s actually height)\n\n    // line dimensions in pixels:\n\n    vec2 pixelSize = (hom1.xy - hom0.xy) * hx_renderTargetResolution * .5;\n\n    // line-\"width\" = max(abs(pixelSize.x), abs(pixelSize.y))\n    // ratio pixel/width = 1 / max(abs(pixelSize.x), abs(pixelSize.y))\n\n    float stepRatio = 1.0 / max(abs(pixelSize.x), abs(pixelSize.y)) * stepSize;\n\n    vec2 uvEnd = hom1.xy * .5 + .5;\n\n    vec2 dUV = (uvEnd - uv) * stepRatio;\n    hitUV = uv;\n\n    // linear depth\n    float rayDepth = (-ray0.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;\n    float rayPerspDepth0 = rayDepth * rcpW0;\n    float rayPerspDepth1 = (-ray1.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange * rcpW1;\n    float rayPerspDepth = rayPerspDepth0;\n    // could probably optimize this:\n    float dRayD = (rayPerspDepth1 - rayPerspDepth0) * stepRatio;\n\n    float rcpW = rcpW0;\n    float dRcpW = (rcpW1 - rcpW0) * stepRatio;\n    float sceneDepth = rayDepth;\n\n    float amount = 0.0;\n\n    hitUV += dUV * dither.z;\n    rayPerspDepth += dRayD * dither.z;\n    rcpW += dRcpW * dither.z;\n\n    float sampleCount;\n    for (int i = 0; i < NUM_SAMPLES; ++i) {\n        rayDepth = rayPerspDepth / rcpW;\n\n        sceneDepth = hx_sampleLinearDepth(hx_gbufferDepth, hitUV);\n\n        if (rayDepth > sceneDepth + .001) {\n            amount = float(sceneDepth < 1.0);\n            sampleCount = float(i);\n            break;\n        }\n\n        hitUV += dUV;\n        rayPerspDepth += dRayD;\n        rcpW += dRcpW;\n    }\n\n    hitZ = -hx_cameraNearPlaneDistance - sceneDepth * hx_cameraFrustumRange;\n\n    // TODO: fade out last samples\n    amount *= clamp((1.0 - (sampleCount - float(NUM_SAMPLES)) / float(NUM_SAMPLES)) * 5.0, 0.0, 1.0);\n    return amount;\n}\n\nvoid main()\n{\n    vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));\n    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n    float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    vec3 normalSpecularReflectance;\n    float roughness;\n    float metallicness;\n    hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n    vec3 normal = hx_decodeNormal(texture2D(hx_gbufferNormals, uv));\n    vec3 reflDir = reflect(normalize(viewDir), normal);\n\n    vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflDir, normal);\n    // not physically correct, but attenuation is required to look good\n\n    // step for every pixel\n\n    float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n    vec3 viewSpacePos = absViewZ * viewDir;\n\n    float hitZ = 0.0;\n    vec2 hitUV;\n    float amount = raytrace(viewSpacePos, reflDir, hitZ, hitUV);\n    float fadeFactor = 1.0 - clamp(reflDir.z * 2.0, 0.0, 1.0);\n\n    vec2 borderFactors = abs(hitUV * 2.0 - 1.0);\n    borderFactors = (1.0 - borderFactors) * 10.0;\n    fadeFactor *= clamp(borderFactors.x, 0.0, 1.0) * clamp(borderFactors.y, 0.0, 1.0);\n\n    float diff = viewSpacePos.z - hitZ;\n    fadeFactor *= hx_linearStep(-1.0, 0.0, diff);\n    fadeFactor *= hx_linearStep(maxRoughness, 0.0, roughness);\n\n    vec4 reflColor = texture2D(hx_frontbuffer, hitUV);\n\n    float amountUsed = amount * fadeFactor;\n    gl_FragColor = vec4(fresnel * reflColor.xyz, amountUsed);\n}\n\n';

HX.ShaderLibrary['ssr_stencil_fragment.glsl'] = 'uniform sampler2D hx_gbufferSpecular;\n\nvarying vec2 uv;\n\nuniform float maxRoughness;\n\nvoid main()\n{\n    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n    if (specularSample.x > maxRoughness)\n        discard;\n}\n\n';

HX.ShaderLibrary['ssr_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['tonemap_filmic_fragment.glsl'] = 'void main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	vec3 x = max(vec3(0.0), color.xyz - 0.004);\n\n	// this has pow 2.2 gamma included, not valid if using fast gamma correction\n	//gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);\n\n    // Jim Hejl and Richard Burgess-Dawson\n	float a = 6.2;\n    float b = .5;\n    float c = 6.2;\n    float d = 1.7;\n    float e = 0.06;\n\n	// ACES\n	/*float a = 2.51;\n    float b = 0.03;\n    float c = 2.43;\n    float d = 0.59;\n    float e = 0.14;*/\n	gl_FragColor = vec4(saturate((x*(a*x+b))/(x*(c*x+d)+e)), 1.0);\n}';

HX.ShaderLibrary['tonemap_reference_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_frontbuffer;\n\nvoid main()\n{\n	vec4 color = texture2D(hx_frontbuffer, uv);\n	float lum = clamp(hx_luminance(color), 0.0, 1000.0);\n	float l = log(1.0 + lum);\n	gl_FragColor = vec4(l, l, l, 1.0);\n}';

HX.ShaderLibrary['tonemap_reinhard_fragment.glsl'] = 'void main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	gl_FragColor = color / (1.0 + color);\n}';

HX.ShaderLibrary['dir_shadow_esm.glsl'] = 'vec4 hx_getShadowMapValue(float depth)\n{\n    // I wish we could write exp directly, but precision issues (can\'t encode real floats)\n    return vec4(exp(HX_ESM_CONSTANT * depth));\n// so when blurring, we\'ll need to do ln(sum(exp())\n//    return vec4(depth);\n}\n\nfloat hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)\n{\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;\n    shadowMapCoord.z += depthBias;\n//    float diff = shadowSample - shadowMapCoord.z;\n//    return saturate(HX_ESM_DARKENING * exp(HX_ESM_CONSTANT * diff));\n    return saturate(HX_ESM_DARKENING * shadowSample * exp(-HX_ESM_CONSTANT * shadowMapCoord.z));\n}';

HX.ShaderLibrary['dir_shadow_hard.glsl'] = 'vec4 hx_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\nfloat hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)\n{\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));\n    float diff = shadowMapCoord.z - shadowSample - depthBias;\n    return float(diff < 0.0);\n}';

HX.ShaderLibrary['dir_shadow_pcf.glsl'] = '#ifdef HX_PCF_DITHER_SHADOWS\n    uniform sampler2D hx_dither2D;\n    uniform vec2 hx_dither2DTextureScale;\n#endif\n\nuniform vec2 hx_poissonDisk[HX_PCF_NUM_SHADOW_SAMPLES];\n\nvec4 hx_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\nfloat hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)\n{\n    vec2 radii = vec2(shadowMapMatrix[0][0], shadowMapMatrix[1][1]) * HX_PCF_SOFTNESS;\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    float shadowTest = 0.0;\n\n    #ifdef HX_PCF_DITHER_SHADOWS\n        vec4 dither = texture2D(hx_dither2D, screenUV * hx_dither2DTextureScale);\n        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * radii.xxyy;  // add radius scale\n    #else\n        vec4 dither = radii.xxyy;\n    #endif\n\n    for (int i = 0; i < HX_PCF_NUM_SHADOW_SAMPLES; ++i) {\n        vec2 offset;\n        offset.x = dot(dither.xy, hx_poissonDisk[i]);\n        offset.y = dot(dither.zw, hx_poissonDisk[i]);\n        float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy + offset));\n        float diff = shadowMapCoord.z - shadowSample - depthBias;\n        shadowTest += float(diff < 0.0);\n    }\n\n    return shadowTest * HX_PCF_RCP_NUM_SHADOW_SAMPLES;\n}';

HX.ShaderLibrary['dir_shadow_vsm.glsl'] = 'vec4 hx_getShadowMapValue(float depth)\n{\n    return vec4(hx_floatToRG8(depth), hx_floatToRG8(depth * depth));\n}\n\nfloat hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)\n{\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    vec4 s = texture2D(shadowMap, shadowMapCoord.xy);\n    vec2 moments = vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));\n    shadowMapCoord.z += depthBias;\n\n    float variance = moments.y - moments.x * moments.x;\n    variance = max(variance, HX_VSM_MIN_VARIANCE);\n    // transparents could be closer to the light than casters\n    float diff = max(shadowMapCoord.z - moments.x, 0.0);\n    float upperBound = variance / (variance + diff*diff);\n    return saturate((upperBound - HX_VSM_LIGHT_BLEED_REDUCTION) / HX_VSM_LIGHT_BLEED_REDUCTION_RANGE);\n}';

HX.ShaderLibrary['esm_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\nuniform vec2 direction; // this is 1/pixelSize\n\nfloat readValue(vec2 coord)\n{\n    float v = texture2D(source, coord).x;\n    return v;\n//    return exp(HX_ESM_CONSTANT * v);\n}\n\nvoid main()\n{\n    float total = readValue(uv);\n\n	for (int i = 1; i <= RADIUS; ++i) {\n	    vec2 offset = direction * float(i);\n		total += readValue(uv + offset) + readValue(uv - offset);\n	}\n\n//	gl_FragColor = vec4(log(total * RCP_NUM_SAMPLES) / HX_ESM_CONSTANT);\n	gl_FragColor = vec4(total * RCP_NUM_SAMPLES);\n}';

HX.ShaderLibrary['vsm_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\nuniform vec2 direction; // this is 1/pixelSize\n\nvec2 readValues(vec2 coord)\n{\n    vec4 s = texture2D(source, coord);\n    return vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));\n}\n\nvoid main()\n{\n    vec2 total = readValues(uv);\n\n	for (int i = 1; i <= RADIUS; ++i) {\n	    vec2 offset = direction * float(i);\n		total += readValues(uv + offset) + readValues(uv - offset);\n	}\n\n    total *= RCP_NUM_SAMPLES;\n\n	gl_FragColor.xy = hx_floatToRG8(total.x);\n	gl_FragColor.zw = hx_floatToRG8(total.y);\n}';

HX.ShaderLibrary['apply_blending_fragment.glsl'] = 'varying vec2 uv;\nvarying vec2 uvBottom;\nvarying vec2 uvTop;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_backbuffer;\n\nvoid main()\n{\n// if transparency type is 0, it\'s opaque and alpha represents unlit/lit ratio\n    vec4 transpColor = texture2D(hx_gbufferColor, uv);\n    vec4 opaqueColor = (texture2D(hx_gbufferColor, uvBottom) + texture2D(hx_gbufferColor, uvTop)) * .5;\n\n    vec3 transpLight = texture2D(hx_backbuffer, uv).xyz;\n    vec3 opaqueLight = (texture2D(hx_backbuffer, uvBottom).xyz + texture2D(hx_backbuffer, uvTop).xyz) * .5;\n    vec4 normalSampleTop = texture2D(hx_gbufferNormals, uv);\n    vec4 normalSampleBottom = texture2D(hx_gbufferNormals, uvBottom);\n    float transparencyMode = normalSampleTop.w;\n    float transparencyModeBottom = normalSampleBottom.w;\n    float emissionTop = normalSampleTop.z * HX_EMISSION_RANGE;\n    float emissionBottom = normalSampleBottom.z * HX_EMISSION_RANGE;\n\n    transpLight *= max(1.0 - emissionTop, 0.0);\n    opaqueLight *= max(1.0 - emissionBottom, 0.0);\n    transpLight += transpColor.xyz * emissionTop;\n    opaqueLight += opaqueColor.xyz * emissionBottom;\n\n    // swap pixels if the current pixel is not the transparent one, but the neighbour is\n    if (transparencyModeBottom != HX_TRANSPARENCY_OPAQUE) {\n        transparencyMode = transparencyModeBottom;\n        vec4 temp = transpColor;\n        transpColor = opaqueColor;\n        opaqueColor = temp;\n\n        temp.xyz = opaqueLight;\n        opaqueLight = transpLight;\n        transpLight = temp.xyz;\n    }\n\n    float srcFactor = transparencyMode == HX_TRANSPARENCY_OPAQUE? 1.0 : transpColor.w;\n    float dstFactor = transparencyMode == HX_TRANSPARENCY_ADDITIVE? 1.0 : 1.0 - srcFactor;\n\n    gl_FragColor = vec4(opaqueLight * dstFactor + transpLight * srcFactor, 1.0);\n}\n';

HX.ShaderLibrary['apply_blending_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec2 uvBottom;\nvarying vec2 uvTop;\n\nuniform float pixelHeight;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    uvBottom = hx_texCoord + vec2(0.0, pixelHeight);\n    uvTop = hx_texCoord - vec2(0.0, pixelHeight);\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['copy_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n    // extractChannel comes from a macro\n   gl_FragColor = vec4(extractChannels(texture2D(sampler, uv)));\n\n#ifndef COPY_ALPHA\n   gl_FragColor.a = 1.0;\n#endif\n}\n';

HX.ShaderLibrary['copy_to_gamma_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   gl_FragColor = vec4(hx_linearToGamma(texture2D(sampler, uv).xyz), 1.0);\n}';

HX.ShaderLibrary['copy_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['copy_with_separate_alpha_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\nuniform sampler2D alphaSource;\n\nvoid main()\n{\n   gl_FragColor = texture2D(sampler, uv);\n   gl_FragColor.a = texture2D(alphaSource, uv).a;\n}\n';

HX.ShaderLibrary['debug_depth_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   gl_FragColor = vec4(1.0 - hx_sampleLinearDepth(sampler, uv));\n}';

HX.ShaderLibrary['debug_normals_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   vec4 data = texture2D(sampler, uv);\n   vec3 normal = hx_decodeNormal(data);\n   gl_FragColor = vec4(normal * .5 + .5, 1.0);\n}';

HX.ShaderLibrary['debug_transparency_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n// GREY = OPAQUE\n// RED = ALPHA\n// BLUE = ADDITIVE\n\n    float mode = texture2D(sampler, uv).w;\n    if (mode == HX_TRANSPARENCY_ALPHA)\n        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n    else if (mode == HX_TRANSPARENCY_ADDITIVE)\n        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);\n    else\n        gl_FragColor = vec4(.25, .25, .25, 1.0);\n}';

HX.ShaderLibrary['linearize_depth_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\nuniform mat4 hx_projectionMatrix;\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\nfloat readDepth()\n{\n#ifdef HX_NO_DEPTH_TEXTURES\n    vec4 data;\n    data.xy = texture2D(sampler, uv).zw;\n    return hx_RG8ToFloat(data.xy);\n#else\n    return texture2D(sampler, uv).x;\n#endif\n}\n\nvoid main()\n{\n	float depth = readDepth();\n	float linear = (-hx_depthToViewZ(depth, hx_projectionMatrix) - hx_cameraNearPlaneDistance) / hx_cameraFrustumRange;\n	gl_FragColor = hx_floatToRGBA8(linear);\n}';

HX.ShaderLibrary['linearize_depth_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['multiply_color_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\nuniform vec4 color;\n\nvoid main()\n{\n    // extractChannel comes from a macro\n   gl_FragColor = texture2D(sampler, uv) * color;\n}\n';

HX.ShaderLibrary['null_fragment.glsl'] = 'void main()\n{\n   gl_FragColor = vec4(1.0);\n}\n';

HX.ShaderLibrary['null_vertex.glsl'] = 'attribute vec4 hx_position;\n\nvoid main()\n{\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['reproject_fragment.glsl'] = 'uniform sampler2D depth;\nuniform sampler2D source;\n\nvarying vec2 uv;\n\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\nuniform mat4 hx_projectionMatrix;\n\nuniform mat4 reprojectionMatrix;\n\nvec2 reproject(vec2 uv, float z)\n{\n    // need z in NDC homogeneous coords to be able to unproject\n    vec4 ndc;\n    ndc.xy = uv.xy * 2.0 - 1.0;\n    // Unprojected Z will just end up being Z again, so could put this in the unprojection matrix itself?\n    ndc.z = (hx_projectionMatrix[2][2] * z + hx_projectionMatrix[3][2]) / -z;   // ndc = hom.z / hom.w\n    ndc.w = 1.0;\n    vec4 hom = reprojectionMatrix * ndc;\n    return hom.xy / hom.w * .5 + .5;\n}\n\nvoid main()\n{\n    float depth = hx_sampleLinearDepth(depth, uv);\n    float z = -hx_cameraNearPlaneDistance - depth * hx_cameraFrustumRange;\n    vec2 reprojectedUV = reproject(uv, z);\n    gl_FragColor = texture2D(source, reprojectedUV);\n}\n\n';

HX.ShaderLibrary['snippets_general.glsl'] = '#define HX_TRANSPARENCY_OPAQUE 0.0\n#define HX_TRANSPARENCY_ALPHA 1.0 / 255.0\n#define HX_TRANSPARENCY_ADDITIVE 2.0 / 255.0\n#define HX_EMISSION_RANGE 25.5\n\nfloat saturate(float value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec2 saturate(vec2 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec3 saturate(vec3 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec4 saturate(vec4 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\n// Only for 0 - 1\nvec4 hx_floatToRGBA8(float value)\n{\n    vec4 enc = value * vec4(1.0, 255.0, 65025.0, 16581375.0);\n    // cannot fract first value or 1 would not be encodable\n    enc.yzw = fract(enc.yzw);\n    return enc - enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);\n}\n\nfloat hx_RGBA8ToFloat(vec4 rgba)\n{\n    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));\n}\n\nvec2 hx_floatToRG8(float value)\n{\n    vec2 enc = vec2(1.0, 255.0) * value;\n    enc.y = fract(enc.y);\n    enc.x -= enc.y / 255.0;\n    return enc;\n}\n\nfloat hx_RG8ToFloat(vec2 rg)\n{\n    return dot(rg, vec2(1.0, 1.0/255.0));\n}\n\nvec3 hx_decodeNormal(vec4 data)\n{\n    data.xy = data.xy*4.0 - 2.0;\n    float f = dot(data.xy, data.xy);\n    float g = sqrt(1.0 - f * .25);\n    vec3 normal;\n    normal.xy = data.xy * g;\n    normal.z = 1.0 - f * .5;\n    return normal;\n}\n\nvec4 hx_gammaToLinear(vec4 color)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        color.xyz *= color.xyz;\n    #endif\n    return color;\n}\n\nvec3 hx_gammaToLinear(vec3 color)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        color.xyz *= color.xyz;\n    #endif\n    return color;\n}\n\nvec4 hx_linearToGamma(vec4 linear)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        linear.x = pow(linear.x, 0.454545);\n        linear.y = pow(linear.y, 0.454545);\n        linear.z = pow(linear.z, 0.454545);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        linear.xyz = sqrt(linear.xyz);\n    #endif\n    return linear;\n}\n\nvec3 hx_linearToGamma(vec3 linear)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        linear.x = pow(linear.x, 0.454545);\n        linear.y = pow(linear.y, 0.454545);\n        linear.z = pow(linear.z, 0.454545);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        linear.xyz = sqrt(linear.xyz);\n    #endif\n    return linear;\n}\n\nfloat hx_sampleLinearDepth(sampler2D tex, vec2 uv)\n{\n    return hx_RGBA8ToFloat(texture2D(tex, uv));\n}\n\nvec3 hx_getFrustumVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unprojNear = unprojectionMatrix * vec4(position, -1.0, 1.0);\n    vec4 unprojFar = unprojectionMatrix * vec4(position, 1.0, 1.0);\n    return unprojFar.xyz/unprojFar.w - unprojNear.xyz/unprojNear.w;\n}\n\n// view vector with z = -1, so we can use nearPlaneDist + linearDepth * (farPlaneDist - nearPlaneDist) as a scale factor to find view space position\nvec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);\n    unproj /= unproj.w;\n    return -unproj.xyz / unproj.z;\n}\n\n// THIS IS FOR NON_LINEAR DEPTH!\nfloat hx_depthToViewZ(float depthSample, mat4 projectionMatrix)\n{\n//    z = -projectionMatrix[3][2] / (d * 2.0 - 1.0 + projectionMatrix[2][2])\n    return -projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);\n}\n\nvec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 color)\n{\n    return mix(vec3(insulatorNormalSpecularReflectance), color, metallicness);\n}\n\n// for use when sampling gbuffer data for lighting\nvoid hx_decodeReflectionData(in vec4 colorSample, in vec4 specularSample, out vec3 normalSpecularReflectance, out float roughness, out float metallicness)\n{\n    //prevent from being 0\n    roughness = clamp(specularSample.x, .01, 1.0);\n	metallicness = specularSample.z;\n    normalSpecularReflectance = mix(vec3(specularSample.y * .2), colorSample.xyz, metallicness);\n}\n\nvec3 hx_fresnel(vec3 normalSpecularReflectance, vec3 lightDir, vec3 halfVector)\n{\n    float cosAngle = 1.0 - max(dot(halfVector, lightDir), 0.0);\n    // to the 5th power\n    float power = pow(cosAngle, 5.0);\n    return normalSpecularReflectance + (1.0 - normalSpecularReflectance) * power;\n}\n\nfloat hx_luminance(vec4 color)\n{\n    return dot(color.xyz, vec3(.30, 0.59, .11));\n}\n\nfloat hx_luminance(vec3 color)\n{\n    return dot(color, vec3(.30, 0.59, .11));\n}\n\n// linear variant of smoothstep\nfloat hx_linearStep(float lower, float upper, float x)\n{\n    return clamp((x - lower) / (upper - lower), 0.0, 1.0);\n}';

HX.ShaderLibrary['snippets_geometry_pass.glsl'] = 'struct GeometryData\n{\n    vec4 color;\n    vec3 normal;\n    float metallicness;\n    float specularNormalReflection;\n    float roughness;\n    float emission;\n    float transparencyMode;\n    float linearDepth;\n};\n\n// emission of 1.0 is the same as \"unlit\", anything above emits more\nvec4 hx_encodeNormal(vec3 normal, float emission, float transparencyMode)\n{\n    vec4 data;\n    float p = sqrt(normal.z*8.0 + 8.0);\n    data.xy = normal.xy / p + .5;\n    data.z = emission / HX_EMISSION_RANGE;\n    data.w = transparencyMode;\n    return data;\n}\n\nvec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness)\n{\n	return vec4(roughness, specularNormalReflection * 5.0, metallicness, 1.0);\n}\n\n#ifdef HX_NO_DEPTH_TEXTURES\nvoid hx_processGeometryMRT(GeometryData data, out vec4 gColor, out vec4 gNormals, out vec4 gSpec, out vec4 gDepth)\n#else\nvoid hx_processGeometryMRT(GeometryData data, out vec4 gColor, out vec4 gNormals, out vec4 gSpec)\n#endif\n{\n    gColor = data.color;\n	gNormals = hx_encodeNormal(data.normal, data.emission, data.transparencyMode);\n    gSpec = hx_encodeSpecularData(data.metallicness, data.specularNormalReflection, data.roughness);\n\n    #ifdef HX_NO_DEPTH_TEXTURES\n    gDepth = hx_floatToRGBA8(data.linearDepth);\n    #endif\n}\n\n#if defined(HX_NO_MRT_GBUFFER_COLOR)\n#define hx_processGeometry(data) (gl_FragColor = data.color)\n#elif defined(HX_NO_MRT_GBUFFER_NORMALS)\n#define hx_processGeometry(data) (gl_FragColor = hx_encodeNormal(data.normal, data.emission, data.transparencyMode))\n#elif defined(HX_NO_MRT_GBUFFER_SPECULAR)\n#define hx_processGeometry(data) (gl_FragColor = hx_encodeSpecularData(data.metallicness, data.specularNormalReflection, data.roughness))\n#elif defined(HX_NO_MRT_GBUFFER_LINEAR_DEPTH)\n#define hx_processGeometry(data) (gl_FragColor = hx_floatToRGBA8(data.linearDepth))\n#elif defined(HX_SHADOW_DEPTH_PASS)\n#define hx_processGeometry(data) (gl_FragColor = hx_getShadowMapValue(data.linearDepth))\n#elif defined(HX_NO_DEPTH_TEXTURES)\n#define hx_processGeometry(data) hx_processGeometryMRT(data, gl_FragData[0], gl_FragData[1], gl_FragData[2], gl_FragData[3])\n#else\n#define hx_processGeometry(data) hx_processGeometryMRT(data, gl_FragData[0], gl_FragData[1], gl_FragData[2])\n#endif';

HX.ShaderLibrary['snippets_tonemap.glsl'] = 'varying vec2 uv;\n\n#ifdef ADAPTIVE\nuniform sampler2D hx_luminanceMap;\nuniform float hx_luminanceMipLevel;\n#endif\n\nuniform float hx_exposure;\n\nuniform sampler2D hx_backbuffer;\n\n\nvec4 hx_getToneMapScaledColor()\n{\n    #ifdef ADAPTIVE\n    float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x) - 1.0;\n    referenceLuminance = clamp(referenceLuminance, .08, 1000.0);\n	float key = 1.03 - (2.0 / (2.0 + log(referenceLuminance + 1.0)/log(10.0)));\n	float exposure = key / referenceLuminance * hx_exposure;\n	#else\n	float exposure = hx_exposure;\n	#endif\n    return texture2D(hx_backbuffer, uv) * exposure;\n}';

HX.ShaderLibrary['2d_to_cube_vertex.glsl'] = '// position to write to\nattribute vec4 hx_position;\n\n// the corner of the cube map\nattribute vec3 corner;\n\nvarying vec3 direction;\n\nvoid main()\n{\n    direction = corner;\n    gl_Position = hx_position;\n}\n';

HX.ShaderLibrary['equirectangular_to_cube_fragment.glsl'] = '#define RECIPROCAL_PI2 0.15915494\n\nvarying vec3 direction;\n\nuniform sampler2D source;\n\nvoid main()\n{\n    vec3 dir = normalize(direction);\n    vec2 uv;\n    uv.x = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	uv.y = dir.y * 0.5 + 0.5;\n    gl_FragColor = texture2D(source, uv);\n}\n';

HX.ShaderLibrary['ao_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\nuniform vec2 halfTexelOffset;\n\nvoid main()\n{\n    vec4 total = texture2D(source, uv - halfTexelOffset * 3.0);\n    total += texture2D(source, uv + halfTexelOffset);\n	gl_FragColor = total * .5;\n}';

HX.ShaderLibrary['hbao_fragment.glsl'] = 'uniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform mat4 hx_projectionMatrix;\n\nuniform float strengthPerRay;\nuniform float halfSampleRadius;\nuniform float bias;\nuniform float rcpFallOffDistance;\nuniform vec2 ditherScale;\n\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D sampleDirTexture;\nuniform sampler2D ditherTexture;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvec3 getViewPos(vec2 sampleUV)\n{\n    float depth = hx_sampleLinearDepth(hx_gbufferDepth, sampleUV);\n    float viewZ = depth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n    vec3 viewPos = frustumCorner * vec3(sampleUV * 2.0 - 1.0, 1.0);\n    return viewPos * viewZ;\n}\n\n// Retrieves the occlusion factor for a particular sample\nfloat getSampleOcclusion(vec2 sampleUV, vec3 centerViewPos, vec3 centerNormal, vec3 tangent, inout float topOcclusion)\n{\n    vec3 sampleViewPos = getViewPos(sampleUV);\n\n    // get occlusion factor based on candidate horizon elevation\n    vec3 horizonVector = sampleViewPos - centerViewPos;\n    float horizonVectorLength = length(horizonVector);\n\n    float occlusion;\n\n    // If the horizon vector points away from the tangent, make an estimate\n    if (dot(tangent, horizonVector) < 0.0)\n        occlusion = .5;\n    else\n        occlusion = dot(centerNormal, horizonVector) / horizonVectorLength;\n\n    // this adds occlusion only if angle of the horizon vector is higher than the previous highest one without branching\n    float diff = max(occlusion - topOcclusion, 0.0);\n    topOcclusion = max(occlusion, topOcclusion);\n\n    // attenuate occlusion contribution using distance function 1 - (d/f)^2\n    float distanceFactor = clamp(horizonVectorLength * rcpFallOffDistance, 0.0, 1.0);\n    distanceFactor = 1.0 - distanceFactor * distanceFactor;\n    return diff * distanceFactor;\n}\n\n// Retrieves the occlusion for a given ray\nfloat getRayOcclusion(vec2 direction, float jitter, vec2 projectedRadii, vec3 centerViewPos, vec3 centerNormal)\n{\n    // calculate the nearest neighbour sample along the direction vector\n    vec2 texelSizedStep = direction * hx_rcpRenderTargetResolution;\n    direction *= projectedRadii;\n\n    // gets the tangent for the current ray, this will be used to handle opposing horizon vectors\n    // Tangent is corrected with respect to face normal by projecting it onto the tangent plane defined by the normal\n    vec3 tangent = getViewPos(uv + texelSizedStep) - centerViewPos;\n    tangent -= dot(centerNormal, tangent) * centerNormal;\n\n    vec2 stepUV = direction.xy / float(NUM_SAMPLES_PER_RAY - 1);\n\n    // jitter the starting position for ray marching between the nearest neighbour and the sample step size\n    vec2 jitteredOffset = mix(texelSizedStep, stepUV, jitter);\n    //stepUV *= 1.0 + jitter * .1;\n    vec2 sampleUV = uv + jitteredOffset;\n\n    // top occlusion keeps track of the occlusion contribution of the last found occluder.\n    // set to bias value to avoid near-occluders\n    float topOcclusion = bias;\n    float occlusion = 0.0;\n\n    // march!\n    for (int step = 0; step < NUM_SAMPLES_PER_RAY; ++step) {\n        occlusion += getSampleOcclusion(sampleUV, centerViewPos, centerNormal, tangent, topOcclusion);\n        sampleUV += stepUV;\n    }\n\n    return occlusion;\n}\n\nvoid main()\n{\n    vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n    vec3 centerNormal = hx_decodeNormal(normalSample);\n    float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    float viewZ = hx_cameraNearPlaneDistance + centerDepth * hx_cameraFrustumRange;\n    vec3 centerViewPos = viewZ * viewDir;\n\n    // clamp z to a minimum, so the radius does not get excessively large in screen-space\n    float projRadius = halfSampleRadius / max(-centerViewPos.z, 7.0);\n    vec2 projectedRadii = projRadius * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]);\n\n    // do not take more steps than there are pixels\n    float totalOcclusion = 0.0;\n\n    vec2 randomFactors = texture2D(ditherTexture, uv * ditherScale).xy;\n\n    vec2 rayUV = vec2(0.0);\n    for (int i = 0; i < NUM_RAYS; ++i) {\n        rayUV.x = (float(i) + randomFactors.x) / float(NUM_RAYS);\n        vec2 sampleDir = texture2D(sampleDirTexture, rayUV).xy * 2.0 - 1.0;\n        totalOcclusion += getRayOcclusion(sampleDir, randomFactors.y, projectedRadii, centerViewPos, centerNormal);\n    }\n\n    totalOcclusion = 1.0 - clamp(strengthPerRay * totalOcclusion, 0.0, 1.0);\n    gl_FragColor = vec4(vec3(totalOcclusion), 1.0);\n}';

HX.ShaderLibrary['hbao_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    frustumCorner = hx_getLinearDepthViewVector(vec2(1.0, 1.0), hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['ssao_fragment.glsl'] = 'uniform mat4 hx_projectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\n\nuniform vec2 ditherScale;\nuniform float strengthPerSample;\nuniform float rcpFallOffDistance;\nuniform float sampleRadius;\nuniform vec3 samples[NUM_SAMPLES]; // w contains bias\n\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D ditherTexture;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n    vec3 centerNormal = hx_decodeNormal(normalSample);\n    float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    float totalOcclusion = 0.0;\n    vec3 dither = texture2D(ditherTexture, uv * ditherScale).xyz;\n    vec3 randomPlaneNormal = normalize(dither - .5);\n    float w = centerDepth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n    vec3 sampleRadii;\n    sampleRadii.x = sampleRadius * .5 * hx_projectionMatrix[0][0] / w;\n    sampleRadii.y = sampleRadius * .5 * hx_projectionMatrix[1][1] / w;\n    sampleRadii.z = sampleRadius;\n\n    for (int i = 0; i < NUM_SAMPLES; ++i) {\n        vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);\n        vec3 normOffset = normalize(sampleOffset);\n        float cosFactor = dot(normOffset, centerNormal);\n        float sign = sign(cosFactor);\n        sampleOffset *= sign;\n        cosFactor *= sign;\n\n        vec3 scaledOffset = sampleOffset * sampleRadii;\n\n        vec2 samplePos = uv + scaledOffset.xy;\n        float occluderDepth = hx_sampleLinearDepth(hx_gbufferDepth, samplePos);\n        float diffZ = (centerDepth - occluderDepth) * hx_cameraFrustumRange;\n\n        // distanceFactor: from 1 to 0, near to far\n        float distanceFactor = clamp(diffZ * rcpFallOffDistance, 0.0, 1.0);\n        distanceFactor = 1.0 - distanceFactor;\n\n        // sampleOcclusion: 1 if occluding, 0 otherwise\n        float sampleOcclusion = float(diffZ > scaledOffset.z);\n        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;\n    }\n    gl_FragColor = vec4(vec3(1.0 - totalOcclusion * strengthPerSample), 1.0);\n}';

/**
 * Creates a new Float2 object
 * @class
 * @constructor
 */
HX.Float2 = function(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
};


/**
 * Returns the angle between two vectors
 */
HX.Float2.angle = function(a, b)
{
    return Math.acos(HX.dot2(a, b) / (a.length * b.length));
};

HX.Float2.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
HX.Float2.angleNormalized = function(a, b)
{
    return Math.acos(HX.dot2(a, b));
};

HX.Float2.add = function(a, b, target)
{
    target = target || new HX.Float2();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    return target;
};

HX.Float2.subtract = function(a, b, target)
{
    target = target || new HX.Float2();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    return target;
};

HX.Float2.scale = function(a, s, target)
{
    target = target || new HX.Float2();
    target.x = a.x * s;
    target.y = a.y * s;
    return target;
};

HX.Float2.negate = function(a, b, target)
{
    target = target || new HX.Float2();
    target.x = -target.x;
    target.y = -target.y;
    return target;
};

HX.Float2.prototype =
{
    constructor: HX.Float2,

    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y;
    },

    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    clone: function()
    {
        return new HX.Float2(this.x, this.y);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    lerp: function(a, b, factor)
    {
        var ax = a.x, ay = a.y;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
    },

    fromPolarCoordinates: function(radius, angle)
    {
        this.x = radius*Math.cos(angle);
        this.y = radius*Math.sin(angle);
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
    }
};

HX.Float2.ZERO = new HX.Float2(0, 0);
HX.Float2.X_AXIS = new HX.Float2(1, 0);
HX.Float2.Y_AXIS = new HX.Float2(0, 1);
HX.PlaneSide = {
    FRONT: 1,
    BACK: -1,
    INTERSECTING: 0
};

/**
 * Creates a new Float4 object, which can be used as a vector (w = 0), a point (w = 1) or a homogeneous coordinate.
 * @class
 * @constructor
 */
HX.Float4 = function(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
};


/**
 * Returns the angle between two vectors
 */
HX.Float4.angle = function(a, b)
{
    return Math.acos(HX.dot3(a, b) / (a.length * b.length));
};

HX.Float4.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

HX.Float4.negate = function(a, target)
{
    target = target || new HX.Float4();
    target.x = -a.x;
    target.y = -a.y;
    target.z = -a.z;
    target.w = -a.w;
    return target;
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
HX.Float4.angleNormalized = function(a, b)
{
    return Math.acos(HX.dot3(a, b));
};

HX.Float4.add = function(a, b, target)
{
    target = target || new HX.Float4();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    target.z = a.z + b.z;
    target.w = a.w + b.w;
    return target;
};

HX.Float4.subtract = function(a, b, target)
{
    target = target || new HX.Float4();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    target.z = a.z - b.z;
    target.w = a.w - b.w;
    return target;
};

HX.Float4.scale = function(a, s, target)
{
    target = target || new HX.Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    //target.w = a.w * s;
    return target;
};

HX.Float4.scale4 = function(a, s, target)
{
    target = target || new HX.Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    target.w = a.w * s;
    return target;
};

HX.Float4.prototype = {
    constructor: HX.Float4,

    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w === undefined? this.w : w;
    },

    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    },

    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
    },

    normalizeAsPlane: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        this.w *= rcpLength;
    },

    clone: function()
    {
        return new HX.Float4(this.x, this.y, this.z, this.w);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        //this.w *= s;
    },

    scale4: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Project to carthesian 3D space by dividing by w
     */
    homogeneousProject: function()
    {
        var rcpW = 1.0/w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        this.w = Math.abs(this.w);
    },

    cross: function(a, b)
    {
        // safe to use self as parameter
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;

        this.x = ay*bz - az*by;
        this.y = az*bx - ax*bz;
        this.z = ax*by - ay*bx;
    },

    lerp: function(a, b, factor)
    {
        var ax = a.x, ay = a.y, az = a.z, aw = a.w;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
        this.z = az + (b.z - az) * factor;
        this.w = aw + (b.w - aw) * factor;
    },

    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.cos(polarAngle);
        this.z = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.w = 0.0;
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        if (b.w > this.w) this.w = b.w;
    },

    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
        if (b.w < this.w) this.w = b.w;
    },

    minimize3: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
    },

    toString: function()
    {
        return "Float4(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

HX.Float4.ORIGIN_POINT = new HX.Float4(0, 0, 0, 1);
HX.Float4.ZERO = new HX.Float4(0, 0, 0, 0);
HX.Float4.X_AXIS = new HX.Float4(1, 0, 0, 0);
HX.Float4.Y_AXIS = new HX.Float4(0, 1, 0, 0);
HX.Float4.Z_AXIS = new HX.Float4(0, 0, 1, 0);
HX.Gaussian =
{
    estimateGaussianRadius: function (variance, epsilon)
    {
        return Math.sqrt(-2.0 * variance * Math.log(epsilon));
    }
};

HX.CenteredGaussianCurve = function(variance)
{
    this._amplitude = 1.0 / Math.sqrt(2.0 * variance * Math.PI);
    this._expScale = -1.0 / (2.0 * variance);
};

HX.CenteredGaussianCurve.prototype =
{
    getValueAt: function(x)
    {
        return this._amplitude * Math.pow(Math.E, x*x*this._expScale);
    }
};

HX.CenteredGaussianCurve.fromRadius = function(radius, epsilon)
{
    epsilon = epsilon || .01;
    var standardDeviation = radius / Math.sqrt(-2.0 * Math.log(epsilon));
    return new HX.CenteredGaussianCurve(standardDeviation*standardDeviation);
};
/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot2 = function(a, b)
{
    return a.x * b.x + a.y * b.y;
};

/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot3 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

/**
 * Calculates the full 4-component dot product.
 */
HX.dot4 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

HX.sign = function(v)
{
    return  v === 0.0? 0.0 :
            v > 0.0? 1.0 : -1.0;
};

HX.RCP_LOG_OF_2 = 1.0 / Math.log(2);
HX.DEG_TO_RAD = Math.PI / 180.0;
HX.RAD_TO_DEG = 180.0 / Math.PI;

HX.log2 = function(value)
{
    return Math.log(value) * HX.RCP_LOG_OF_2;
};

HX.clamp = function(value, min, max)
{
    return  value < min?    min :
            value > max?    max :
                            value;
};

HX.saturate = function(value)
{
    return HX.clamp(value, 0.0, 1.0);
};

HX.lerp = function(a, b, factor)
{
    return a + (b - a) * factor;
};
/**
 * Creates a new Matrix4x4 object.
 * Column-major storage. Vector multiplication is in column format (ie v' = M x v)
 * @class
 * @constructor
 */
HX.Matrix4x4 = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
{
    if (m00 !== undefined && isNaN(m00)) {
        this._m = new Float32Array(m00);
    }
    else {
        var m = this._m = new Float32Array(16);

        m[0] = m00 === undefined ? 1 : 0;
        m[1] = m10 || 0;
        m[2] = m20 || 0;
        m[3] = m30 || 0;
        m[4] = m01 || 0;
        m[5] = m11 === undefined ? 1 : 0;
        m[6] = m21 || 0;
        m[7] = m31 || 0;
        m[8] = m02 || 0;
        m[9] = m12 || 0;
        m[10] = m22 === undefined ? 1 : 0;
        m[11] = m32 || 0;
        m[12] = m03 || 0;
        m[13] = m13 || 0;
        m[14] = m23 || 0;
        m[15] = m33 === undefined ? 1 : 0;
    }
};

HX.Matrix4x4.prototype =
{
    constructor: HX.Matrix4x4,

    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4)
     */
    transform: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z, w = v.w;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        target.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a point. Slightly faster than transform for points.
     */
    transformPoint: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14];
        target.w = 1.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     */
    transformVector: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        target.x = m[0] * x + m[4] * y + m[8] * z;
        target.y = m[1] * x + m[5] * y + m[9] * z;
        target.z = m[2] * x + m[6] * y + m[10] * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size (so always abs)! Slightly faster than transform for vectors.
     */
    transformExtent: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        var m00 = m[0], m10 = m[1], m20 = m[2];
        var m01 = m[4], m11 = m[5], m21 = m[6];
        var m02 = m[8], m12 = m[9], m22 = m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        target.x = m00 * x + m01 * y + m02 * z;
        target.y = m10 * x + m11 * y + m12 * z;
        target.z = m20 * x + m21 * y + m22 * z;
        target.w = 0.0;

        return target;
    },

    copyFrom: function(a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] = mm[0];
        m[1] = mm[1];
        m[2] = mm[2];
        m[3] = mm[3];
        m[4] = mm[4];
        m[5] = mm[5];
        m[6] = mm[6];
        m[7] = mm[7];
        m[8] = mm[8];
        m[9] = mm[9];
        m[10] = mm[10];
        m[11] = mm[11];
        m[12] = mm[12];
        m[13] = mm[13];
        m[14] = mm[14];
        m[15] = mm[15];
    },

    fromQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;

        var m = this._m;
        m[0] = 1 - 2 * (y * y + z * z);
        m[1] = 2 * (x * y + w * z);
        m[2] = 2 * (x * z - w * y);
        m[3] = 0;
        m[4] = 2 * (x * y - w * z);
        m[5] = 1 - 2 * (x * x + z * z);
        m[6] = 2 * (y * z + w * x);
        m[7] = 0;
        m[8] = 2 * (x * z + w * y);
        m[9] = 2 * (y * z - w * x);
        m[10] = 1 - 2 * (x * x + y * y);
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    multiply: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2], a_m30 = am[3];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6], a_m31 = am[7];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10], a_m32 = am[11];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14], a_m33 = am[15];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14], b_m33 = bm[15];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        m[3] = a_m30 * b_m00 + a_m31 * b_m10 + a_m32 * b_m20 + a_m33 * b_m30;
        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        m[7] = a_m30 * b_m01 + a_m31 * b_m11 + a_m32 * b_m21 + a_m33 * b_m31;
        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;
        m[11] = a_m30 * b_m02 + a_m31 * b_m12 + a_m32 * b_m22 + a_m33 * b_m32;
        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03 * b_m33;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13 * b_m33;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23 * b_m33;
        m[15] = a_m30 * b_m03 + a_m31 * b_m13 + a_m32 * b_m23 + a_m33 * b_m33;
    },

    multiplyAffine: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23;

    },

    fromRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;


        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var m = this._m;
        m[0] = oneMinCos * x * x + cos;
        m[1] = oneMinCos * x * y + sin * z;
        m[2] = oneMinCos * x * z - sin * y;
        m[3] = 0;
        m[4] = oneMinCos * x * y - sin * z;
        m[5] = oneMinCos * y * y + cos;
        m[6] = oneMinCos * y * z + sin * x;
        m[7] = 0;
        m[8] = oneMinCos * x * z + sin * y;
        m[9] = oneMinCos * y * z - sin * x;
        m[10] = oneMinCos * z * z + cos;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    // this actually doesn't use a vector, because they're three unrelated quantities. A vector just doesn't make sense here, mathematically.
    fromEuler: function (x, y, z)
    {
        var cosX = Math.cos(x);
        var sinX = Math.sin(x);
        var cosY = Math.cos(y);
        var sinY = Math.sin(y);
        var cosZ = Math.cos(z);
        var sinZ = Math.sin(z);

        var m = this._m;
        m[0] = cosY * cosZ;
        m[1] = cosX * sinZ + sinX * sinY * cosZ;
        m[2] = sinX * sinZ - cosX * sinY * cosZ;
        m[3] = 0;
        m[4] = -cosY * sinZ;
        m[5] = cosX * cosZ - sinX * sinY * sinZ;
        m[6] = sinX * cosZ + cosX * sinY * sinZ;
        m[7] = 0;
        m[8] = sinY;
        m[9] = -sinX * cosY;
        m[10] = cosX * cosY;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    // Tait-Bryan angles, not classic Euler
    fromRotationPitchYawRoll: function (pitch, yaw, roll)
    {
        var cosP = Math.cos(-pitch);
        var cosY = Math.cos(-yaw);
        var cosR = Math.cos(roll);
        var sinP = Math.sin(-pitch);
        var sinY = Math.sin(-yaw);
        var sinR = Math.sin(roll);

        var zAxisX = -sinY * cosP;
        var zAxisY = -sinP;
        var zAxisZ = cosY * cosP;

        var yAxisX = -cosY * sinR - sinY * sinP * cosR;
        var yAxisY = cosP * cosR;
        var yAxisZ = -sinY * sinR + sinP * cosR * cosY;

        var xAxisX = yAxisY * zAxisZ - yAxisZ * zAxisY;
        var xAxisY = yAxisZ * zAxisX - yAxisX * zAxisZ;
        var xAxisZ = yAxisX * zAxisY - yAxisY * zAxisX;

        var m = this._m;
        m[0] = xAxisX;
        m[1] = xAxisY;
        m[2] = xAxisZ;
        m[3] = 0;
        m[4] = yAxisX;
        m[5] = yAxisY;
        m[6] = yAxisZ;
        m[7] = 0;
        m[8] = zAxisX;
        m[9] = zAxisY;
        m[10] = zAxisZ;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    fromTranslation: function (xOrV, y, z)
    {
        if (y === undefined) {
            xOrV = xOrV.x;
            y = xOrV.y;
            z = xOrV.z;
        }
        var m = this._m;
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = 1;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 1;
        m[11] = 0;
        m[12] = xOrV;
        m[13] = y;
        m[14] = z;
        m[15] = 1;
    },

    fromScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] = x;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = y;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = z;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    fromPerspectiveProjection: function (vFOV, aspectRatio, nearDistance, farDistance)
    {
        var yMax = 1.0 / Math.tan(vFOV * .5);
        var xMax = yMax / aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = xMax;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = yMax;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = (farDistance + nearDistance) * rcpFrustumDepth;
        m[11] = -1;

        m[12] = 0;
        m[13] = 0;
        m[14] = 2 * nearDistance * farDistance * rcpFrustumDepth;
        m[15] = 0;
    },

    fromOrthographicOffCenterProjection: function (left, right, top, bottom, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / (right - left);
        var rcpHeight = 1.0 / (top - bottom);
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 2.0 * rcpWidth;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 2.0 * rcpHeight;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = 2.0 * rcpDepth;
        m[11] = 0;

        m[12] = -(left + right) * rcpWidth;
        m[13] = -(top + bottom) * rcpHeight;
        m[14] = (farDistance + nearDistance) * rcpDepth;
        m[15] = 1;
    },

    fromOrthographicProjection: function (width, height, nearDistance, farDistance)
    {
        var yMax = Math.tan(vFOV * .5);
        var xMax = yMax * aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 1 / xMax;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = 1 / yMax;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 2 * rcpFrustumDepth;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = (farDistance + nearDistance) * rcpFrustumDepth;
        m[15] = 1;
    },

    clone: function ()
    {
        return new HX.Matrix4x4(this._m);
    },

    transpose: function ()
    {
        var m = this._m;
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m6 = m[6];
        var m7 = m[7];
        var m11 = m[11];

        m[1] = m[4];
        m[2] = m[8];
        m[3] = m[12];

        m[4] = m1;
        m[6] = m[9];
        m[7] = m[13];

        m[8] = m2;
        m[9] = m6;
        m[11] = m[14];

        m[12] = m3;
        m[13] = m7;
        m[14] = m11;
    },

    /**
     * The determinant of a 3x3 minor matrix (matrix created by removing a given row and column)
     * @private
     */
    determinant3x3: function (row, col)
    {
        // todo: can this be faster?
        // columns are the indices * 4 (to form index for row 0)
        var c1 = col == 0 ? 4 : 0;
        var c2 = col < 2 ? 8 : 4;
        var c3 = col == 3 ? 8 : 12;
        var r1 = row == 0 ? 1 : 0;
        var r2 = row < 2 ? 2 : 1;
        var r3 = row == 3 ? 2 : 3;

        var m = this._m;
        var m21 = m[c1 | r2], m22 = m[r2 | c2], m23 = m[c3 | r2];
        var m31 = m[c1 | r3], m32 = m[c2 | r3], m33 = m[r3 | c3];

        return      m[c1 | r1] * (m22 * m33 - m23 * m32)
            - m[c2 | r1] * (m21 * m33 - m23 * m31)
            + m[c3 | r1] * (m21 * m32 - m22 * m31);
    },

    cofactor: function (row, col)
    {
        // should be able to xor sign bit instead
        var sign = 1 - (((row + col) & 1) << 1);
        return sign * this.determinant3x3(row, col);
    },

    getCofactorMatrix: function (row, col, target)
    {
        target = target || new HX.Matrix4x4();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i & 3, i >> 2);

        return target;
    },

    getAdjugate: function (row, col, target)
    {
        target = target || new HX.Matrix4x4();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i >> 2, i & 3);    // transposed!

        return target;
    },

    determinant: function ()
    {
        var m = this._m;
        return m[0] * this.determinant3x3(0, 0) - m[4] * this.determinant3x3(0, 1) + m[8] * this.determinant3x3(0, 2) - m[12] * this.determinant3x3(0, 3);
    },

    inverseOf: function (m)
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / m.determinant();

        // needs to be self-assignment-proof
        var m0 = rcpDet * m.cofactor(0, 0);
        var m1 = rcpDet * m.cofactor(0, 1);
        var m2 = rcpDet * m.cofactor(0, 2);
        var m3 = rcpDet * m.cofactor(0, 3);
        var m4 = rcpDet * m.cofactor(1, 0);
        var m5 = rcpDet * m.cofactor(1, 1);
        var m6 = rcpDet * m.cofactor(1, 2);
        var m7 = rcpDet * m.cofactor(1, 3);
        var m8 = rcpDet * m.cofactor(2, 0);
        var m9 = rcpDet * m.cofactor(2, 1);
        var m10 = rcpDet * m.cofactor(2, 2);
        var m11 = rcpDet * m.cofactor(2, 3);
        var m12 = rcpDet * m.cofactor(3, 0);
        var m13 = rcpDet * m.cofactor(3, 1);
        var m14 = rcpDet * m.cofactor(3, 2);
        var m15 = rcpDet * m.cofactor(3, 3);

        var m = this._m;
        m[0] = m0;
        m[1] = m1;
        m[2] = m2;
        m[3] = m3;
        m[4] = m4;
        m[5] = m5;
        m[6] = m6;
        m[7] = m7;
        m[8] = m8;
        m[9] = m9;
        m[10] = m10;
        m[11] = m11;
        m[12] = m12;
        m[13] = m13;
        m[14] = m14;
        m[15] = m15;
    },

    /**
     * If you know it's an affine matrix (such as general transforms rather than perspective projection matrices), use this.
     * @param m
     */
    inverseAffineOf: function (a)
    {
        var mm = a._m;
        var m0 = mm[0], m1 = mm[1], m2 = mm[2];
        var m4 = mm[4], m5 = mm[5], m6 = mm[6];
        var m8 = mm[8], m9 = mm[9], m10 = mm[10];
        var m12 = mm[12], m13 = mm[13], m14 = mm[14];
        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        var n0 = (m5 * m10 - m9 * m6) * rcpDet;
        var n1 = (m9 * m2 - m1 * m10) * rcpDet;
        var n2 = (m1 * m6 - m5 * m2) * rcpDet;
        var n4 = (m8 * m6 - m4 * m10) * rcpDet;
        var n5 = (m0 * m10 - m8 * m2) * rcpDet;
        var n6 = (m4 * m2 - m0 * m6) * rcpDet;
        var n8 = (m4 * m9 - m8 * m5) * rcpDet;
        var n9 = (m8 * m1 - m0 * m9) * rcpDet;
        var n10 = (m0 * m5 - m4 * m1) * rcpDet;

        var m = this._m;
        m[0] = n0;
        m[1] = n1;
        m[2] = n2;
        m[3] = 0;
        m[4] = n4;
        m[5] = n5;
        m[6] = n6;
        m[7] = 0;
        m[8] = n8;
        m[9] = n9;
        m[10] = n10;
        m[11] = 0;
        m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
        m[15] = 1;
    },

    /**
     * Writes the inverse transpose into an array for upload (must support 9 elements)
     */
    writeNormalMatrix: function (array, index)
    {
        index = index || 0;
        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        array[index] = (m5 * m10 - m9 * m6) * rcpDet;
        array[index + 1] = (m8 * m6 - m4 * m10) * rcpDet;
        array[index + 2] = (m4 * m9 - m8 * m5) * rcpDet;
        array[index + 3] = (m9 * m2 - m1 * m10) * rcpDet;
        array[index + 4] = (m0 * m10 - m8 * m2) * rcpDet;
        array[index + 5] = (m8 * m1 - m0 * m9) * rcpDet;
        array[index + 6] = (m1 * m6 - m5 * m2) * rcpDet;
        array[index + 7] = (m4 * m2 - m0 * m6) * rcpDet;
        array[index + 8] = (m0 * m5 - m4 * m1) * rcpDet;
    },

    writeData: function(array, index)
    {
        index = index || 0;
        var m = this._m;
        for (var i = 0; i < 16; ++i)
            array[index + i] = m[i];
    },

    invert: function ()
    {
        this.inverseOf(this);
    },

    invertAffine: function ()
    {
        this.inverseAffineOf(this);
    },

    append: function (m)
    {
        this.multiply(m, this);
    },

    prepend: function (m)
    {
        this.multiply(this, m);
    },

    appendAffine: function (m)
    {
        this.multiplyAffine(m, this);
    },

    prependAffine: function (m)
    {
        this.multiplyAffine(this, m);
    },

    add: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[3] += mm[3];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[7] += mm[7];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
        m[11] += mm[11];
        m[12] += mm[12];
        m[13] += mm[13];
        m[14] += mm[14];
        m[15] += mm[15];
    },

    addAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
    },

    subtract: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[3] -= mm[3];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[7] -= mm[7];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
        m[11] -= mm[11];
        m[12] -= mm[12];
        m[13] -= mm[13];
        m[14] -= mm[14];
        m[15] -= mm[15];
    },

    subtractAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
    },

    appendScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= y;
        m[2] *= z;
        m[4] *= x;
        m[5] *= y;
        m[6] *= z;
        m[8] *= x;
        m[9] *= y;
        m[10] *= z;
        m[12] *= x;
        m[13] *= y;
        m[14] *= z;
    },

    prependScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= x;
        m[2] *= x;
        m[3] *= x;
        m[4] *= y;
        m[5] *= y;
        m[6] *= y;
        m[7] *= y;
        m[8] *= z;
        m[9] *= z;
        m[10] *= z;
        m[11] *= z;
    },

    appendTranslation: function (v)
    {
        var m = this._m;
        m[12] += v.x;
        m[13] += v.y;
        m[14] += v.z;
    },

    prependTranslation: function (v)
    {
        var m = this._m;
        var x = v.x, y = v.y, z = v.z;
        m[12] += m[0] * x + m[4] * y + m[8] * z;
        m[13] += m[1] * x + m[5] * y + m[9] * z;
        m[14] += m[2] * x + m[6] * y + m[10] * z;
        m[15] += m[3] * x + m[7] * y + m[11] * z;
    },

    appendQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = 1 - 2 * (y * y + z * z), a_m10 = 2 * (x * y + w * z), a_m20 = 2 * (x * z - w * y);
        var a_m01 = 2 * (x * y - w * z), a_m11 = 1 - 2 * (x * x + z * z), a_m21 = 2 * (y * z + w * x);
        var a_m02 = 2 * (x * z + w * y), a_m12 = 2 * (y * z - w * x), a_m22 = 1 - 2 * (x * x + y * y);

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = 1 - 2 * (y * y + z * z), b_m10 = 2 * (x * y + w * z), b_m20 = 2 * (x * z - w * y);
        var b_m01 = 2 * (x * y - w * z), b_m11 = 1 - 2 * (x * x + z * z), b_m21 = 2 * (y * z + w * x);
        var b_m02 = 2 * (x * z + w * y), b_m12 = 2 * (y * z - w * x), b_m22 = 1 - 2 * (x * x + y * y);

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    appendRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = oneMinCos * x * x + cos, a_m10 = oneMinCos * x * y + sin * z, a_m20 = oneMinCos * x * z - sin * y;
        var a_m01 = oneMinCos * x * y - sin * z, a_m11 = oneMinCos * y * y + cos, a_m21 = oneMinCos * y * z + sin * x;
        var a_m02 = oneMinCos * x * z + sin * y, a_m12 = oneMinCos * y * z - sin * x, a_m22 = oneMinCos * z * z + cos;

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = oneMinCos * x * x + cos, b_m10 = oneMinCos * x * y + sin * z, b_m20 = oneMinCos * x * z - sin * y;
        var b_m01 = oneMinCos * x * y - sin * z, b_m11 = oneMinCos * y * y + cos, b_m21 = oneMinCos * y * z + sin * x;
        var b_m02 = oneMinCos * x * z + sin * y, b_m12 = oneMinCos * y * z - sin * x, b_m22 = oneMinCos * z * z + cos;

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    getRow: function (index, target)
    {
        var m = this._m;
        target = target || new HX.Float4();
        target.x = m[index];
        target.y = m[index | 4];
        target.z = m[index | 8];
        target.w = m[index | 12];
        return target;
    },

    setRow: function (index, v)
    {
        var m = this._m;
        m[index] = v.x;
        m[index | 4] = v.y;
        m[index | 8] = v.z;
        m[index | 12] = v.w;
    },

    getElement: function(row, col)
    {
        return this._m[row | (col << 2)];
    },

    setElement: function(row, col, value)
    {
        this._m[row | (col << 2)] = value;
    },

    getColumn: function (index, target)
    {
        var m = this._m;
        target = target || new HX.Float4();
        index <<= 2;
        target.x = m[index];
        target.y = m[index | 1];
        target.z = m[index | 2];
        target.w = m[index | 3];
        return target;
    },

    setColumn: function (index, v)
    {
        var m = this._m;
        index <<= 2;
        m[index] = v.x;
        m[index | 1] = v.y;
        m[index | 2] = v.z;
        m[index | 3] = v.w;
    },

    /**
     * @param target
     * @param eye
     * @param up Must be unit length
     */
    lookAt: function (target, eye, up)
    {
        var zAxis = HX.Float4.subtract(eye, target);
        zAxis.normalize();

        var xAxis = new HX.Float4();
        xAxis.cross(up, zAxis);

        if (Math.abs(xAxis.lengthSqr) > .0001) {
            xAxis.normalize();
        }
        else {
            var altUp = new HX.Float4(up.x, up.z, up.y, 0.0);
            xAxis.cross(altUp, zAxis);
            if (Math.abs(xAxis.lengthSqr) <= .0001) {
                altUp.set(up.z, up.y, up.z, 0.0);
                xAxis.cross(altUp, zAxis);
            }
            xAxis.normalize();
        }

        var yAxis = new HX.Float4();
        yAxis.cross(zAxis, xAxis);	// should already be unit length

        var m = this._m;
        m[0] = xAxis.x;
        m[1] = xAxis.y;
        m[2] = xAxis.z;
        m[3] = 0.0;
        m[4] = yAxis.x;
        m[5] = yAxis.y;
        m[6] = yAxis.z;
        m[7] = 0.0;
        m[8] = zAxis.x;
        m[9] = zAxis.y;
        m[10] = zAxis.z;
        m[11] = 0.0;
        m[12] = eye.x;
        m[13] = eye.y;
        m[14] = eye.z;
        m[15] = 1.0;
    },

    /**
     * Generates a matrix from a transform object
     */
    compose: function(transform)
    {
        this.fromQuaternion(transform.rotation);
        var scale = transform.scale;
        this.prependScale(scale.x, scale.y, scale.z);
        this.appendTranslation(transform.position);
    },

    /**
     * Decomposes an affine transformation matrix into a Transform object, or a triplet position, quaternion, scale.
     * @param targetOrPos An optional target object to store the values. If this is a Float4, quat and scale need to be provided. If omitted, a new Transform object will be created and returned.
     * @param quat An optional quaternion to store rotation. Unused if targetOrPos is a Transform object.
     * @param quat An optional Float4 to store scale. Unused if targetOrPos is a Transform object.
     */
    decompose: function (targetOrPos, quat, scale)
    {
        targetOrPos = targetOrPos || new HX.Transform();

        var pos;
        if (quat === undefined) {
            quat = targetOrPos.rotation;
            scale = targetOrPos.scale;
            pos = targetOrPos.position;
        }
        else pos = targetOrPos;

        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

        // check for negative scale by calculating cross X x Y (positive scale should yield the same Z)
        var cx = m1*m6 - m2*m5;
        var cy = m2*m4 - m0*m6;
        var cz = m0*m5 - m1*m4;

        // dot cross product X x Y with Z < 0? Lefthanded flip.
        var flipSign = HX.sign(cx * m8 + cy * m9 + cz * m10);

        // we assign the flipSign to all three instead of just 1, so that if a uniform negative scale was used, this will
        // be preserved
        scale.x = flipSign * Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        scale.y = flipSign * Math.sqrt(m4 * m4 + m5 * m5 + m6 * m6);
        scale.z = flipSign * Math.sqrt(m8 * m8 + m9 * m9 + m10 * m10);
        var clone = this.clone();

        var rcpX = 1.0 / scale.x, rcpY = 1.0 / scale.y, rcpZ = 1.0 / scale.z;

        var cm = clone._m;
        cm[0] *= rcpX;
        cm[1] *= rcpX;
        cm[2] *= rcpX;
        cm[4] *= rcpY;
        cm[5] *= rcpY;
        cm[6] *= rcpY;
        cm[8] *= rcpZ;
        cm[9] *= rcpZ;
        cm[10] *= rcpZ;

        quat.fromMatrix(clone);
        pos.copyFrom(this.getColumn(3));

        return targetOrPos;
    },

    swapColums: function(i, j)
    {
        var m = this._m;
        if (i === j) return;
        i <<= 2;
        j <<= 2;
        var x = m[i];
        var y = m[i | 1];
        var z = m[i | 2];
        var w = m[i | 3];
        m[i] = m[j];
        m[i | 1] = m[j | 1];
        m[i | 2] = m[j | 2];
        m[i | 3] = m[j | 3];
        m[j] = x;
        m[j | 1] = y;
        m[j | 2] = z;
        m[j | 3] = w;
    },

    toString: function()
    {
        var m = this._m;
        var str = "";
        for (var i = 0; i < 16; ++i) {
            var mod = i & 0x3;
            if (mod === 0)
                str += "[";

            str += m[i];

            if (mod === 3)
                str += "]\n";
            else
                str += "\t , \t";
        }
        return str;
    }
};

HX.Matrix4x4.IDENTITY = new HX.Matrix4x4();
HX.Matrix4x4.ZERO = new HX.Matrix4x4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/**
 *
 * @param mode
 * @param initialDistance
 * @param decayFactor
 * @param maxTests
 * @constructor
 */
HX.PoissonDisk = function(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? HX.PoissonDisk.CIRCULAR : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
};

HX.PoissonDisk.SQUARE = 0;
HX.PoissonDisk.CIRCULAR = 1;

HX.PoissonDisk._initDefault = function()
{
    HX.PoissonDisk.DEFAULT = new HX.PoissonDisk();
    HX.PoissonDisk.DEFAULT.generatePoints(64);
    HX.PoissonDisk.DEFAULT_FLOAT32 = new Float32Array(64 * 2);

    var diskPoints = HX.PoissonDisk.DEFAULT.getPoints();

    for (var i = 0; i < 64; ++i) {
        var p = diskPoints[i];
        HX.PoissonDisk.DEFAULT_FLOAT32[i * 2] = p.x;
        HX.PoissonDisk.DEFAULT_FLOAT32[i * 2 + 1] = p.y;
    }
};

HX.PoissonDisk.prototype =
{
    getPoints: function()
    {
        return this._points;
    },

    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            if (this._mode == HX.PoissonDisk.SQUARE || (x * x + y * y <= 1))
                return new HX.Float2(x, y);
        }
    },

    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            if (dx*dx + dy*dy < sqrDistance)
                return false;
        }

            return true;
    }
};
/**
 *
 * @param mode
 * @param initialDistance
 * @param decayFactor
 * @param maxTests
 * @constructor
 */
HX.PoissonSphere = function(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? HX.PoissonSphere.CIRCULAR : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
};

HX.PoissonSphere.BOX = 0;
HX.PoissonSphere.CIRCULAR = 1;

HX.PoissonSphere._initDefault = function()
{
    HX.PoissonSphere.DEFAULT = new HX.PoissonSphere();
    HX.PoissonSphere.DEFAULT.generatePoints(64);
    HX.PoissonSphere.DEFAULT_FLOAT32 = new Float32Array(64 * 3);

    var spherePoints = HX.PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < 64; ++i) {
        var p = spherePoints[i];
        HX.PoissonSphere.DEFAULT_FLOAT32[i * 3] = p.x;
        HX.PoissonSphere.DEFAULT_FLOAT32[i * 3 + 1] = p.y;
        HX.PoissonSphere.DEFAULT_FLOAT32[i * 3 + 2] = p.z;
    }
};

HX.PoissonSphere.prototype =
{
    getPoints: function()
    {
        return this._points;
    },

    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            var z = Math.random() * 2.0 - 1.0;
            if (this._mode == HX.PoissonSphere.BOX || (x * x + y * y + z * z <= 1))
                return new HX.Float4(x, y, z, 0.0);
        }
    },

    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            var dz = candidate.z - p.z;
            if (dx*dx + dy*dy + dz*dz < sqrDistance)
                return false;
        }

        return true;
    }
};
HX.Quaternion = function ()
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
};

HX.Quaternion.prototype =
{
    fromAxisAngle: function (axis, radians)
    {
        var factor = Math.sin(radians * .5) / axis.length;
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(radians * .5);
    },

    // Tait-Bryan angles, not classic Euler, radians
    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new HX.Matrix4x4();
        // wasteful. improve.
        mtx.fromRotationPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
    },

    // X*Y*Z order (meaning z first), radians
    fromEuler: function(x, y, z)
    {
        var cx = Math.cos(x * 0.5), cy = Math.cos(y * 0.5), cz = Math.cos(z * 0.5);
        var sx = Math.sin(x * 0.5), sy = Math.sin(y * 0.5), sz = Math.sin(z * 0.5);

        this.x = sx*cy*cz + cx*sy*sz;
        this.y = cx*sy*cz - sx*cy*sz;
        this.z = cx*cy*sz + sx*sy*cz;
        this.w = cx*cy*cz - sx*sy*sz;
    },

    toEuler: function(target)
    {
        target = target || new HX.Float4();

        var x = this.x, y = this.y, z = this.z, w = this.w;
        var xx = x * x, yy = y * y, zz = z * z, ww = w * w;

        target.x = Math.atan2( -2*(y*z - w*x), ww - xx - yy + zz );
        target.y = Math.asin ( 2*(x*z + w*y) );
        target.z = Math.atan2( -2*(x*y - w*z), ww + xx - yy - zz );

        return target;
    },

    fromMatrix: function(m)
    {
        var m00 = m._m[0];
        var m11 = m._m[5];
        var m22 = m._m[10];
        var trace = m00 + m11 + m22;

        if (trace > 0.0) {
            trace += 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;
            this.x = s*(m._m[6] - m._m[9]);
            this.y = s*(m._m[8] - m._m[2]);
            this.z = s*(m._m[1] - m._m[4]);
            this.w = s*trace;
        }
        else if (m00 > m11 && m00 > m22) {
            trace = m00 - m11 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*trace;
            this.y = s*(m._m[1] + m._m[4]);
            this.z = s*(m._m[8] + m._m[2]);
            this.w = s*(m._m[6] - m._m[9]);
        }
        else if (m11 > m22) {
            trace = m11 - m00 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[1] + m._m[4]);
            this.y = s*trace;
            this.z = s*(m._m[6] + m._m[9]);
            this.w = s*(m._m[8] - m._m[2]);
        }
        else {
            trace = m22 - m00 - m11 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[8] + m._m[2]);
            this.y = s*(m._m[6] + m._m[9]);
            this.z = s*trace;
            this.w = s*(m._m[1] - m._m[4]);
        }

        // this is to prevent non-normalized due to rounding errors
        this.normalize();
    },

    rotate: function(v, target)
    {
        target = target || new HX.Float4();
        var vx = v.x, vy = v.y, vz = v.z;
        var x = this.x, y = this.y, z = this.z, w = this.w;

        // p*q'
        var w1 = - x * vx - y * vy - z * vz;
        var x1 = w * vx + y * vz - z * vy;
        var y1 = w * vy - x * vz + z * vx;
        var z1 = w * vz + x * vy - y * vx;

        target.x = -w1 * x + x1 * w - y1 * z + z1 * y;
        target.y = -w1 * y + x1 * z + y1 * w - z1 * x;
        target.z = -w1 * z - x1 * y + y1 * x + z1 * w;
        target.w = v.w;
        return target;
    },

    lerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        // use shortest direction
        if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        this.x = x1 + factor * (x2 - x1);
        this.y = y1 + factor * (y2 - y1);
        this.z = z1 + factor * (z2 - z1);
        this.w = w1 + factor * (w2 - w1);

        this.normalize();
    },

    slerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;
        var dot = w1*w2 + x1*x2 + y1*y2 + z1*z2;

        // shortest direction
        if (dot < 0.0) {
            dot = -dot;
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        if (dot < 0.95) {
            // interpolate angle linearly
            var angle = Math.acos(dot);
            var interpolatedAngle = factor*angle;

            this.x = x2 - x1*dot;
            this.y = y2 - y1*dot;
            this.z = z2 - z1*dot;
            this.w = w2 - w1*dot;
            this.normalize();

            var cos = Math.cos(interpolatedAngle);
            var sin = Math.sin(interpolatedAngle);
            this.x = x1 * cos + this.x * sin;
            this.y = y1 * cos + this.y * sin;
            this.z = z1 * cos + this.z * sin;
            this.w = w1 * cos + this.w * sin;
        }
        else {
            // nearly identical angle, interpolate linearly
            this.x = x1 + factor * (x2 - x1);
            this.y = y1 + factor * (y2 - y1);
            this.z = z1 + factor * (z2 - z1);
            this.w = w1 + factor * (w2 - w1);
            this.normalize();
        }
    },

    // results in the same net rotation, but with different orientation
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    get normSquared()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    get norm()
    {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    },

    normalize : function()
    {
        var rcpNorm = 1.0/Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
        this.x *= rcpNorm;
        this.y *= rcpNorm;
        this.z *= rcpNorm;
        this.w *= rcpNorm;
    },

    conjugateOf : function(q)
    {
        this.x = -q.x;
        this.y = -q.y;
        this.z = -q.z;
        this.w = q.w;
    },

    inverseOf: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    invert: function (q)
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    multiply: function(a, b)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
        this.y = w1*y2 - x1*z2 + y1*w2 + z1*x2;
        this.z = w1*z2 + x1*y2 - y1*x2 + z1*w2;
        this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
    },

    append: function(q)
    {
        this.multiply(q, this);
    },

    prepend: function(q)
    {
        this.multiply(this, q);
    },

    toString: function()
    {
        return "Quaternion(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }

};
/**
 * An object using position, rotation quaternion and scale to describe an object's transformation.
 *
 * @constructor
 */
HX.Transform = function()
{
    this._position = new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new HX.Quaternion();
    this._scale = new HX.Float4(1.0, 1.0, 1.0, 1.0);
    this._matrix = new HX.Matrix4x4();

    this._changeListener = new HX.PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._rotation, "x");
    this._changeListener.add(this._rotation, "y");
    this._changeListener.add(this._rotation, "z");
    this._changeListener.add(this._rotation, "w");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this._invalidateMatrix, this);
};

HX.Transform.prototype =
{
    get position() {
        return this._position;
    },

    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotation.copyFrom(value);
    },

    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position, HX.Float4.Y_AXIS);
        this._applyMatrix();
    },

    copyFrom: function(transform)
    {
        this._changeListener.enabled = false;
        this.position.copyFrom(transform.position);
        this.rotation.copyFrom(transform.rotation);
        this.scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
    },

    get matrix()
    {
        if (this._matrixInvalid)
            this._updateMatrix();

        return this._matrix;
    },

    set matrix(value)
    {
        this._matrix.copyFrom(value);
        this._applyMatrix();
    },

    _invalidateMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    _updateMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
    }
};
HX.shuffle = function(array)
{
    var currentIndex = array.length, temporaryValue, randomIndex ;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};
/**
 * Hexadecimal representations are always 0xAARRGGBB
 * @param rOrHex
 * @param g
 * @param b
 * @param a
 * @constructor
 */
HX.Color = function(rOrHex, g, b, a)
{
    this.set(rOrHex, g, b, a);
};

HX.Color.prototype =
{
    set: function (rOrHex, g, b, a)
    {
        if (rOrHex === undefined) {
            this.a = 1.0;
            this.r = 1.0;
            this.g = 1.0;
            this.b = 1.0;
        }
        else if (g === undefined) {
            this.a = 1.0;
            this.r = ((rOrHex & 0xff0000) >>> 16) / 255.0;
            this.g = ((rOrHex & 0x00ff00) >>> 8) / 255.0;
            this.b = (rOrHex & 0x0000ff) / 255.0;
        }
        else {
            this.r = rOrHex;
            this.g = g;
            this.b = b;
            this.a = a === undefined ? 1.0 : a;
        }
    },

    hex: function ()
    {
        var r = (Math.min(this.r, 1.0) * 0xff);
        var g = (Math.min(this.g, 1.0) * 0xff);
        var b = (Math.min(this.b, 1.0) * 0xff);

        return (r << 16) | (g << 8) | b;
    },

    luminance: function ()
    {
        return this.r * .30 + this.g * 0.59 + this.b * .11;
    },

    gammaToLinear: function (target)
    {
        target = target || new HX.Color();

        if (HX.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, 2.2);
            target.g = Math.pow(this.g, 2.2);
            target.b = Math.pow(this.b, 2.2);
        }
        else {
            target.r = this.r * this.r;
            target.g = this.g * this.g;
            target.b = this.b * this.b;
        }
        target.a = this.a;

        return target;
    },

    linearToGamma: function (target)
    {
        target = target || new HX.Color();

        if (HX.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, .454545);
            target.g = Math.pow(this.g, .454545);
            target.b = Math.pow(this.b, .454545);
        }
        else {
            target.r = Math.sqrt(this.r);
            target.g = Math.sqrt(this.g);
            target.b = Math.sqrt(this.b);
        }
        target.a = this.a;

        return target;
    },

    copyFrom: function (color)
    {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
    },

    toString: function ()
    {
        return "Color(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    },

    clone: function ()
    {
        var color = new HX.Color();
        color.r = this.r;
        color.g = this.g;
        color.b = this.b;
        color.a = this.a;
        return color;
    }
};

HX.Color.BLACK = new HX.Color(0, 0, 0, 1);
HX.Color.ZERO = new HX.Color(0, 0, 0, 0);
HX.Color.RED = new HX.Color(1, 0, 0, 1);
HX.Color.GREEN = new HX.Color(0, 1, 0, 1);
HX.Color.BLUE = new HX.Color(0, 0, 1, 1);
HX.Color.YELLOW = new HX.Color(1, 1, 0, 1);
HX.Color.MAGENTA = new HX.Color(1, 0, 1, 1);
HX.Color.CYAN = new HX.Color(0, 1, 1, 1);
HX.Color.WHITE = new HX.Color(1, 1, 1, 1);
HX.DataStream = function(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = HX.DataStream.LITTLE_ENDIAN;
};

HX.DataStream.LITTLE_ENDIAN = true;
HX.DataStream.BIG_ENDIAN = false;

HX.DataStream.prototype =
{
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    get endian() { return this._endian; },
    set endian(value) { this._endian = value; },

    get byteLength () { return this._dataView.byteLength; },

    getChar: function()
    {
        return String.fromCharCode(this.getUint8());
    },

    getUint8: function()
    {
        return this._dataView.getUint8(this._offset++);
    },

    getUint16: function()
    {
        var data = this._dataView.getUint16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    getUint32: function()
    {
        var data = this._dataView.getUint32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    getInt8: function()
    {
        return this._dataView.getInt8(this._offset++);
    },

    getInt16: function()
    {
        var data = this._dataView.getInt16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    getInt32: function()
    {
        var data = this._dataView.getInt32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    // dangerous, but might be an okay approximation
    getInt64AsFloat64: function()
    {
        var L, B;
        if (this._endian === HX.DataStream.LITTLE_ENDIAN) {
            L = this._dataView.getUint32(this._offset, this._endian);
            B = this._dataView.getInt32(this._offset + 4, this._endian);
        }
        else {
            B = this._dataView.getInt32(this._offset, this._endian);
            L = this._dataView.getUint32(this._offset + 4, this._endian);
        }
        this._offset += 8;
        return L + B * 4294967296.0;
    },

    getFloat32: function()
    {
        var data = this._dataView.getFloat32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    getFloat64: function()
    {
        var data = this._dataView.getFloat64(this._offset, this._endian);
        this._offset += 8;
        return data;
    },

    getArray: function(len)
    {
        return this._readArray(len, Array, this.getUint8);
    },

    getUint8Array: function(len)
    {
        return this._readArray(len, Uint8Array, this.getUint8);
    },

    getUint16Array: function(len)
    {
        return this._readArray(len, Uint16Array, this.getUint16);
    },

    getUint32Array: function(len)
    {
        return this._readArray(len, Uint32Array, this.getUint32);
    },

    getInt8Array: function(len)
    {
        return this._readArray(len, Int8Array, this.getInt8);
    },

    getInt16Array: function(len)
    {
        return this._readArray(len, Int16Array, this.getInt16);
    },

    getInt32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getInt32);
    },

    getInt64AsFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getInt64AsFloat64);
    },

    getFloat32Array: function(len)
    {
        return this._readArray(len, Float32Array, this.getFloat32);
    },

    getFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getFloat64);
    },

    getString: function(len)
    {
        var str = "";

        for (var i = 0; i < len; ++i)
            str = str + this.getChar();

        return str;
    },

    _readArray: function(len, arrayType, func)
    {
        var arr = new arrayType(len);

        for (var i = 0; i < len; ++i)
            arr[i] = func.call(this);

        return arr;
    }
};
// Just contains some convenience methods and GL management stuff that shouldn't be called directly

// Will become an abstraction layer

// properties to keep track of render state
HX._numActiveAttributes = 0;

HX._renderTargetStack = [ null ];
HX._renderTargetInvalid = true;

HX._viewport = {x: 0, y: 0, width: 0, height: 0};
HX._viewportInvalid = true;

HX._depthMask = true;
HX._depthMaskInvalid = true;

HX._cullMode = null;
HX._cullModeInvalid = true;

HX._depthTest = null;
HX._depthTestInvalid = true;

HX._blendState = null;
HX._blendStateInvalid = false;

// this is so that effects can push states on the stack
// the renderer at the root just pushes one single state and invalidates that constantly
HX._stencilStateStack = [ null ];
HX._stencilStateInvalid = false;

HX._glStats =
{
    numDrawCalls: 0,
    numTriangles: 0,
    numClears: 0
};

HX._clearGLStats = function()
{
    HX._glStats.numDrawCalls = 0;
    HX._glStats.numTriangles = 0;
    HX._glStats.numClears = 0;
};

/**
 * Default clearing function. Can be called if no special clearing functionality is needed (or in case another api is used that clears)
 * Otherwise, you can manually clear using GL context.
 */
HX.clear = function(clearMask)
{
    if (clearMask === undefined)
        clearMask = HX.COMPLETE_CLEAR_MASK;

    HX._updateRenderState();
    HX_GL.clear(clearMask);
    ++HX._glStats.numClears;
};

HX.drawElements = function(elementType, numIndices, offset)
{
    ++HX._glStats.numDrawCalls;
    HX._glStats.numTriangles += numIndices / 3;
    HX._updateRenderState();
    HX_GL.drawElements(elementType, numIndices, HX_GL.UNSIGNED_SHORT, offset * 2);
};


/**
 *
 * @param rect Any object with a width and height property, so it can be a Rect or even an FBO. If x and y are present, it will use these too.
 */
HX.setViewport = function(rect)
{
    HX._viewportInvalid = true;
    if (rect) {
        HX._viewport.x = rect.x || 0;
        HX._viewport.y = rect.y || 0;
        HX._viewport.width = rect.width || 0;
        HX._viewport.height = rect.height || 0;
    }
    else {
        HX._viewport.x = 0;
        HX._viewport.y = 0;
        HX._viewport.width = HX.TARGET_CANVAS.width;
        HX._viewport.height = HX.TARGET_CANVAS.height;
    }
};

HX.getCurrentRenderTarget = function()
{
    return HX._renderTargetStack[HX._renderTargetStack.length - 1];
};

HX.pushRenderTarget = function(frameBuffer)
{
    HX._renderTargetStack.push(frameBuffer);
    HX._renderTargetInvalid = true;
    HX.setViewport(frameBuffer);
};

HX.popRenderTarget = function()
{
    HX._renderTargetStack.pop();
    HX._renderTargetInvalid = true;
    HX.setViewport(HX._renderTargetStack[HX._renderTargetStack.length - 1]);
};

HX.enableAttributes = function(count)
{
    var numActiveAttribs = HX._numActiveAttributes;
    if (numActiveAttribs < count) {
        for (var i = numActiveAttribs; i < count; ++i)
            HX_GL.enableVertexAttribArray(i);
    }
    else if (numActiveAttribs > count) {
        // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
        // so for now + 1
        count += 1;
        for (var i = count; i < numActiveAttribs; ++i) {
            HX_GL.disableVertexAttribArray(i);
        }
    }

    HX._numActiveAttributes = count;
};

HX.setClearColor = function(color)
{
    color = isNaN(color) ? color : new HX.Color(color);
    HX_GL.clearColor(color.r, color.g, color.b, color.a);
};

HX.setCullMode = function(value)
{
    if (HX._cullMode === value) return;
    HX._cullMode = value;
    HX._cullModeInvalid = true;
};

HX.setDepthMask = function(value)
{
    if (HX._depthMask === value) return;
    HX._depthMask = value;
    HX._depthMaskInvalid = true;
};

HX.setDepthTest = function(value)
{
    if (HX._depthTest === value) return;
    HX._depthTest = value;
    HX._depthTestInvalid = true;
};

HX.setBlendState = function(value)
{
    if (HX._blendState === value) return;
    HX._blendState = value;
    HX._blendStateInvalid = true;
};

HX.updateStencilReferenceValue = function(value)
{
    var currentState = HX._stencilStateStack[HX._stencilStateStack.length - 1];

    if (!currentState || currentState.reference === value) return;

    currentState.reference = value;

    if (!HX._stencilStateInvalid && currentState.enabled)
        HX_GL.stencilFunc(currentState.comparison, value, currentState.readMask);
};

HX.pushStencilState = function(frameBuffer)
{
    HX._stencilStateStack.push(frameBuffer);
    HX._stencilStateInvalid = true;
};

HX.popStencilState = function()
{
    HX._stencilStateStack.pop();
    HX._stencilStateInvalid = true;
};

HX._updateRenderState = function()
{
    if (HX._renderTargetInvalid) {
        var target = HX._renderTargetStack[HX._renderTargetStack.length - 1];

        if (target) {
            HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                HX.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, null);

        HX._renderTargetInvalid = false;
    }

    if (this._viewportInvalid) {
        HX_GL.viewport(HX._viewport.x, HX._viewport.y, HX._viewport.width, HX._viewport.height);
        HX._viewportInvalid = false;
    }

    if (HX._depthMaskInvalid) {
        HX_GL.depthMask(HX._depthMask);
        HX._depthMaskInvalid = false;
    }

    if (HX._cullModeInvalid) {
        if (HX._cullMode === HX.CullMode.NONE)
            HX_GL.disable(HX_GL.CULL_FACE);
        else {
            HX_GL.enable(HX_GL.CULL_FACE);
            HX_GL.cullFace(HX._cullMode);
        }
    }

    if (HX._depthTestInvalid) {
        if (HX._depthTest === HX.Comparison.DISABLED)
            HX_GL.disable(HX_GL.DEPTH_TEST);
        else {
            HX_GL.enable(HX_GL.DEPTH_TEST);
            HX_GL.depthFunc(HX._depthTest);
        }
    }

    if (HX._blendStateInvalid) {
        var state = HX._blendState;
        if (state === null || state === undefined || state.enabled === false)
            HX_GL.disable(HX_GL.BLEND);
        else {
            HX_GL.enable(HX_GL.BLEND);
            HX_GL.blendFunc(state.srcFactor, state.dstFactor);
            HX_GL.blendEquation(state.operator);
            var color = state.color;
            if (color)
                HX_GL.blendColor(color.r, color.g, color.b, color.a);
        }
        HX._blendStateInvalid = false;
    }

    if (HX._stencilStateInvalid) {
        var state = HX._stencilStateStack[HX._stencilStateStack.length - 1];
        if (state == null || state.enabled === false) {
            HX_GL.disable(HX_GL.STENCIL_TEST);
            HX_GL.stencilFunc(HX.Comparison.ALWAYS, 0, 0xff);
            HX_GL.stencilOp(HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);
        }
        else {
            HX_GL.enable(HX_GL.STENCIL_TEST);
            HX_GL.stencilFunc(state.comparison, state.reference, state.readMask);
            HX_GL.stencilOp(state.onStencilFail, state.onDepthFail, state.onPass);
            HX_GL.stencilMask(state.writeMask);
        }
        HX._stencilStateInvalid = false;
    }
};
/**
 *
 * @constructor
 */
HX.IndexBuffer = function()
{
    this._buffer = HX_GL.createBuffer();
};

HX.IndexBuffer.prototype = {
    constructor: HX.IndexBuffer,

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Int16Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = HX_GL.STATIC_DRAW;

        this.bind();
        HX_GL.bufferData(HX_GL.ELEMENT_ARRAY_BUFFER, data, usageHint);
    },

    dispose: function()
    {
        if (this._buffer) {
            HX_GL.deleteBuffer(this._buffer);
            this._buffer = 0;
        }
    },

    /**
     * @private
     */
    bind: function()
    {
        HX_GL.bindBuffer(HX_GL.ELEMENT_ARRAY_BUFFER, this._buffer);
    }
};
/**
 * PropertyListener allows listening to changes to other objects' properties. When a change occurs, the onChange signal will be dispatched.
 * It's a bit hackish, but it prevents having to dispatch signals in performance-critical classes such as Float4.
 * @constructor
 */
HX.PropertyListener = function()
{
    this._enabled = true;
    this.onChange = new HX.Signal();
    this._targets = [];
};

HX.PropertyListener.prototype =
{
    /**
     * If false, prevents the PropertyListener from dispatching change events.
     */
    get enabled()
    {
        return this._enabled;
    },

    set enabled(value)
    {
        this._enabled = value;
    },

    /**
     * Starts listening to changes for an object's property for changes.
     * @param targetObj The target object to monitor.
     * @param propertyName The name of the property for which we'll be listening.
     */
    add: function(targetObj, propertyName)
    {
        var index = this._targets.length;
        this._targets.push(
            {
                object: targetObj,
                propertyName: propertyName,
                value: targetObj[propertyName]
            }
        );

        var wrapper = this;
        var target = wrapper._targets[index];
        Object.defineProperty(targetObj, propertyName, {
            get: function() {
                return target.value;
            },
            set: function(val) {
                if (val !== target.value) {
                    target.value = val;
                    if (wrapper._enabled)
                        wrapper.onChange.dispatch();
                }
            }
        });
    },

    /**
     * Stops listening to a property for changes.
     * @param targetObj The object to stop monitoring.
     * @param propertyName The name of the property for which we'll be listening.
     */
    remove: function(targetObj, propertyName)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var target = this._targets[i];
            if (target.object === targetObj && target.propertyName === propertyName) {
                delete target.object[target.propertyName];
                target.object[target.propertyName] = target.value;
                this._targets.splice(i--, 1);
            }
        }
    }
};
HX.Rect = function(x, y, width, height)
{
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
};
HX.Signal = function()
{
    this._listeners = [];
    this._lookUp = {};
};

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
HX.Signal.prototype =
{
    bind: function(listener, thisRef)
    {
        this._lookUp[listener] = this._listeners.length;
        var callback = thisRef? listener.bind(thisRef) : listener;
        this._listeners.push(callback);
    },

    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        this._listeners.splice(index, 1);
        delete this._lookUp[listener];
    },

    dispatch: function(payload)
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i](payload);
    },

    get hasListeners()
    {
        return this._listeners.length > 0;
    }
};
/**
 *
 * @constructor
 */
HX.VertexBuffer = function()
{
    this._buffer = HX_GL.createBuffer();
};

HX.VertexBuffer.prototype = {
    constructor: HX.VertexBuffer,

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Float32Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = HX_GL.STATIC_DRAW;

        this.bind();
        HX_GL.bufferData(HX_GL.ARRAY_BUFFER, data, usageHint);
    },

    dispose: function()
    {
        if (this._buffer) {
            HX_GL.deleteBuffer(this._buffer);
            this._buffer = 0;
        }
    },

    /**
     * @private
     */
    bind: function()
    {
        HX_GL.bindBuffer(HX_GL.ARRAY_BUFFER, this._buffer);
    }
};
HX.FileUtils =
{
    extractPathAndFilename: function(filename)
    {
        var index = filename.lastIndexOf("/");
        var obj = {};

        if (index >= 0) {
            obj.path = filename.substr(0, index + 1);
            obj.filename = filename.substr(index + 1);
        }
        else {
            obj.path = "./";
            obj.filename = filename;
        }

        return obj;
    }
};
HX.URLLoader = function ()
{
    this._params = undefined;
    this._data = null;
    this._timeout = 5000;
    this._method = 'GET';
    this._type = HX.URLLoader.DATA_TEXT;
};

HX.URLLoader.ERROR_TIME_OUT = 408;
HX.URLLoader.METHOD_GET = 'get';
HX.URLLoader.METHOD_POST = 'post';

HX.URLLoader.DATA_TEXT = 0;
HX.URLLoader.DATA_BINARY = 1;

HX.URLLoader.prototype =
{
    get type()
    {
        return this._type;
    },

    set type(value)
    {
        this._type = value;
    },

    get method()
    {
        return this._method;
    },

    set method(value)
    {
        this._method = value;
    },

    get timeoutDuration()
    {
        return this._timeout;
    },

    set timeoutDuration(milliseconds)
    {
        this._timeout = milliseconds;
    },

    get parameters()
    {
        return this._params;
    },

    set parameters(params)
    {
        this._params = params;
    },

    get data()
    {
        return this._data;
    },

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);
        request.timeout = this._timeout;
        if (this._type === HX.URLLoader.DATA_BINARY)
            request.responseType = "arraybuffer";

        var self = this;

        request.ontimeout = function ()
        {
            self.onError(HX.URLLoader.ERROR_TIME_OUT);
        };

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status === 200) {
                    this._data = self._type === HX.URLLoader.DATA_TEXT? request.responseText : new DataView(request.response);
                    if (self.onComplete) self.onComplete(this._data);
                }
                else if (self.onError)
                    self.onError(this.status);
            }
        };

        request.send(this._params);
    },

    // made to assign
    onComplete: function (data)
    {
    },

    onError: function (errorStatus)
    {
    }
};
HX.BulkURLLoader = function ()
{
    this._params = undefined;
    this._timeout = 5000;
    this._method = 'GET';
    this._type = HX.URLLoader.DATA_TEXT;
    this._abortOnFail = false;

    this._files = null;
    this._index = 0;
    this._data = null;
};

HX.BulkURLLoader.prototype =
{
    getData: function(filename)
    {
        return this._data[filename];
    },

    get type()
    {
        return this._type;
    },

    set type(value)
    {
        this._type = value;
    },

    get abortOnFail()
    {
        return this._abortOnFail;
    },

    set abortOnFail(value)
    {
        this._abortOnFail = value;
    },

    get method()
    {
        return this._method;
    },

    set method(value)
    {
        this._method = value;
    },

    get timeoutDuration()
    {
        return this._timeout;
    },

    set timeoutDuration(milliseconds)
    {
        this._timeout = milliseconds;
    },

    get parameters()
    {
        return this._params;
    },

    set parameters(params)
    {
        this._params = params;
    },

    load: function(files)
    {
        this._files = files;
        this._data = {};
        this._index = 0;

        this._loadQueued();
    },

    _loadQueued: function()
    {
        if (this._index === this._files.length) {
            this.onComplete();
            return;
        }

        var urlLoader = new HX.URLLoader();
        urlLoader.parameters = this._params;
        urlLoader.timeoutDuration = this._timeout;
        urlLoader.method = this._method;
        urlLoader.type = this._type;

        var self = this;
        urlLoader.onComplete = function(data)
        {
            var filename = self._files[self._index];
            self._data[filename] = data;
            ++self._index;
            self._loadQueued();
        };

        urlLoader.onFail = function() {
            self.onFail();
            if (self._abortOnFail)
                return;
            else
                urlLoader.onComplete(null);
        };

        urlLoader.load(this._files[this._index]);
    },

    // made to assign
    onComplete: function (data)
    {
    },

    onError: function (errorStatus)
    {
    }
};
/**
 *
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 */
HX.Shader = function(vertexShaderCode, fragmentShaderCode)
{
    this._ready = false;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._program = null;
    this._uniformSetters = null;

    if (vertexShaderCode && fragmentShaderCode)
        this.init(vertexShaderCode, fragmentShaderCode);
};

HX.Shader.ID_COUNTER = 0;

HX.Shader.prototype = {
    constructor: HX.Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode)
    {
        vertexShaderCode = HX.GLSLIncludeGeneral + vertexShaderCode;
        fragmentShaderCode = HX.GLSLIncludeGeneral + fragmentShaderCode;

        this._vertexShader = HX_GL.createShader(HX_GL.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.warn("Failed generating vertex shader");
            }

            return;
        }

        this._fragmentShader = HX_GL.createShader(HX_GL.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError)
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            console.warn("Failed generating fragment shader:");
            return;
        }

        this._program = HX_GL.createProgram();

        HX_GL.attachShader(this._program, this._vertexShader);
        HX_GL.attachShader(this._program, this._fragmentShader);
        HX_GL.linkProgram(this._program);

        if (!HX_GL.getProgramParameter(this._program, HX_GL.LINK_STATUS)) {
            var log = HX_GL.getProgramInfoLog(this._program);
            this.dispose();

            console.log("**********");
            HX.Debug.printShaderCode(vertexShaderCode);
            console.log("**********");
            HX.Debug.printShaderCode(fragmentShaderCode);

            if (HX.OPTIONS.throwOnShaderError)
                throw new Error("Error in program linking:" + log);

            console.warn("Error in program linking:" + log);

            return;
        }

        this._ready = true;

        this._uniformSetters = HX.UniformSetter.getSetters(this);
    },

    updateRenderState: function(worldMatrix, camera)
    {
        HX_GL.useProgram(this._program);

        var len = this._uniformSetters.length;
        for (var i = 0; i < len; ++i) {
            this._uniformSetters[i].execute(worldMatrix, camera);
        }
    },

    _initShader: function(shader, code)
    {
        HX_GL.shaderSource(shader, code);
        HX_GL.compileShader(shader);

        // Check the compile status, return an error if failed
        if (!HX_GL.getShaderParameter(shader, HX_GL.COMPILE_STATUS)) {
            console.warn(HX_GL.getShaderInfoLog(shader));
            HX.Debug.printShaderCode(code);
            return false;
        }

        return true;
    },

    dispose: function()
    {
        HX_GL.deleteShader(this._vertexShader);
        HX_GL.deleteShader(this._fragmentShader);
        HX_GL.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getUniformLocation: function(name)
    {
        return HX_GL.getUniformLocation(this._program, name);
    },

    getAttributeLocation: function(name)
    {
        return HX_GL.getAttribLocation(this._program, name);
    }
};
/**
 *
 * @param shader
 * @constructor
 */
HX.MaterialPass = function (shader)
{
    this._shader = shader;
    this._textureSlots = [];
    this._uniforms = {};
    this._elementType = HX.ElementType.TRIANGLES;
    this._cullMode = HX.CullMode.BACK;
    this._depthTest = HX.Comparison.LESS_EQUAL;
    this._writeDepth = true;
    this._blendState = null;
    this._gbuffer = null;
    this._enabled = true;
    this._storeUniforms();
    this._textureSetters = HX.TextureSetter.getSetters(this);

    // if material supports animations, this would need to be handled properly
    this._useSkinning = false;
};

HX.MaterialPass.GEOMETRY_PASS = 0;

// used for dir lighting etc, depending on shadow mapping type
// this value will be corrected upon init
HX.MaterialPass.SHADOW_DEPTH_PASS = -1;

// the individual pass type are not taken into account, they will be dealt with specially
// this value will be corrected upon init
HX.MaterialPass.NUM_PASS_TYPES = 2;

// use diffuse as alias for geometry pass
// NUM_PASS_TYPES WILL BE SET PROPERLY UPON INITIALISATION DEPENDING ON DRAWBUFFER SUPPORT
HX.MaterialPass.GEOMETRY_COLOR_PASS = HX.MaterialPass.GEOMETRY_PASS;
HX.MaterialPass.GEOMETRY_NORMAL_PASS = HX.MaterialPass.GEOMETRY_PASS + 1;
HX.MaterialPass.GEOMETRY_SPECULAR_PASS = HX.MaterialPass.GEOMETRY_PASS + 2;
HX.MaterialPass.GEOMETRY_LINEAR_DEPTH_PASS = HX.MaterialPass.GEOMETRY_PASS + 3;

HX.MaterialPass.prototype = {
    constructor: HX.MaterialPass,

    getShader: function ()
    {
        return this._shader;
    },

    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
    },

    get depthTest()
    {
        return this._depthTest;
    },

    set depthTest(value)
    {
        this._depthTest = value;
    },

    set writeDepth(value)
    {
        this._writeDepth = value;
    },

    get cullMode()
    {
        return this._cullMode;
    },

    // use null for disabled
    set cullMode(value)
    {
        this._cullMode = value;
    },

    get blendState()
    {
        return this._blendState;
    },

    set blendState(value)
    {
        this._blendState = value;
    },

    updateRenderState: function (renderer)
    {
        var len = this._textureSetters.length;

        for (var i = 0; i < len; ++i)
            this._textureSetters[i].execute(renderer);

        len = this._textureSlots.length;

        for (var i = 0; i < len; ++i) {
            var slot = this._textureSlots[i];
            var texture = slot.texture;

            if (!texture) {
                HX.Texture2D.DEFAULT.bind(i);
                continue;
            }

            if (texture.isReady())
                texture.bind(i);
            else
                texture._default.bind(i);
        }

        HX.setCullMode(this._cullMode);
        HX.setDepthTest(this._depthTest);
        HX.setDepthMask(this._writeDepth);
        HX.setBlendState(this._blendState);
    },

    _storeUniforms: function()
    {
        var len = HX_GL.getProgramParameter(this._shader._program, HX_GL.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = HX_GL.getActiveUniform(this._shader._program, i);
            var name = uniform.name;
            var location = HX_GL.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        HX_GL.useProgram(this._shader._program);

        var uniform = this._uniforms[slotName];

        if (!uniform) return;

        var location = uniform.location;

        var slot = null;

        // reuse if location is already used
        var len = this._textureSlots.length;
        for (var i = 0; i < len; ++i) {
            if (this._textureSlots[i].location === location) {
                slot = this._textureSlots[i];
                break;
            }
        }

        if (slot == null) {
            slot = new HX.TextureSlot();
            slot.name = slotName;
            this._textureSlots.push(slot);
            HX_GL.uniform1i(location, i);
            slot.location = location;
        }

        return slot;
    },

    setTexture: function(slotName, texture)
    {
        var slot = this.getTextureSlot(slotName);
        if (slot)
            slot.texture = texture;
    },

    getUniformLocation: function(name)
    {
        if (this._uniforms.hasOwnProperty(name))
            return this._uniforms[name].location;
    },

    getAttributeLocation: function(name)
    {
        return this._shader.getAttributeLocation(name);
    },

    setUniformArray: function(name, value)
    {
        name = name + "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX_GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX_GL.FLOAT:
                HX_GL.uniform1fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC2:
                HX_GL.uniform2fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC3:
                HX_GL.uniform3fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC4:
                HX_GL.uniform4fv(uniform.location, value);
                break;
            case HX_GL.INT:
                HX_GL.uniform1iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC2:
                HX_GL.uniform2iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC3:
                HX_GL.uniform3iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC4:
                HX_GL.uniform1iv(uniform.location, value);
                break;
            case HX_GL.BOOL:
                HX_GL.uniform1bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC2:
                HX_GL.uniform2bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC3:
                HX_GL.uniform3bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC4:
                HX_GL.uniform4bv(uniform.location, value);
                break;
            default:
                throw new Error("Unsupported uniform format for setting. May be a todo.");

        }
    },

    setUniform: function(name, value)
    {
        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX_GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX_GL.FLOAT:
                HX_GL.uniform1f(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC2:
                HX_GL.uniform2f(uniform.location, value.x, value.y);
                break;
            case HX_GL.FLOAT_VEC3:
                HX_GL.uniform3f(uniform.location, value.x || value.r || 0, value.y || value.g || 0, value.z || value.b || 0 );
                break;
            case HX_GL.FLOAT_VEC4:
                HX_GL.uniform4f(uniform.location, value.x || value.r || 0, value.y || value.g || 0, value.z || value.b || 0, value.w || value.a || 0);
                break;
            case HX_GL.INT:
                HX_GL.uniform1i(uniform.location, value);
                break;
            case HX_GL.INT_VEC2:
                HX_GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX_GL.INT_VEC3:
                HX_GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX_GL.INT_VEC4:
                HX_GL.uniform1i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            case HX_GL.BOOL:
                HX_GL.uniform1i(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC2:
                HX_GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX_GL.BOOL_VEC3:
                HX_GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX_GL.BOOL_VEC4:
                HX_GL.uniform4i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            default:
                throw new Error("Unsupported uniform format for setting. May be a todo.");

        }
    },

    isEnabled: function() { return this._enabled; },
    setEnabled: function(value) { this._enabled = value; }
};


/**
 * Careful! Transparency and blending are two separate concepts!
 * Transparency represents actual transparent objects and affects how the light interacting with the object is
 * added to the rest of the lit scene.
 * Blending merely applies to how passes are applied to their render targets.
 */
HX.TransparencyMode = {
    OPAQUE: 0,              // light coming from behind the object is blocked.
    ALPHA: 1,               // light from behind is transparently blended with incoming light
    ADDITIVE: 2,            // light from behind the object is completely unblocked and added in
    NUM_MODES: 3
};

/**
 *
 * @constructor
 */
HX.Material = function ()
{
    this._elementType = HX.ElementType.TRIANGLES;
    // TODO: should this be passed to the material as a uniform to figure out how to interlace in hx_processGeometry (= overhead for opaque), or should this be a #define and compilation issue?
    // could by default do a test, and if #define FORCE_TRANSPARENCY_MODE <mode> is set, do not. This can be used by PBRMaterial or custom materials to trigger recompilations and optimize.
    this._transparencyMode = HX.TransparencyMode.OPAQUE;
    this._passes = new Array(HX.Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++HX.Material.ID_COUNTER;
    // forced render order by user:
    this._renderOrder = 0;
    this.onChange = new HX.Signal();
    this._textures = {};
    this._uniforms = {};

    this._name = null;
};

HX.Material.ID_COUNTER = 0;

HX.Material.prototype = {
    constructor: HX.Material,

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get transparencyMode()
    {
        return this._transparencyMode;
    },

    set transparencyMode(value)
    {
        this._transparencyMode = value;
        this.setUniform("hx_transparencyMode", this._transparencyMode / 0xff);
    },

    get renderOrder()
    {
        return this._renderOrder;
    },

    set renderOrder(value)
    {
        this._renderOrder = value;
    },

    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].elementType = value;
        }
    },

    getPass: function (type)
    {
        return this._passes[type];
    },

    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === HX.MaterialPass.SHADOW_DEPTH_PASS)
                pass.cullMode = HX.DirectionalLight.SHADOW_FILTER.getCullMode();

            if(type === HX.GEOMETRY_NORMAL_PASS || type === HX.GEOMETRY_SPECULAR_PASS || type == HX.GEOMETRY_LINEAR_DEPTH_PASS)
                pass.depthTest = HX.Comparison.EQUAL;

            pass.elementType = this._elementType;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName))
                    pass.setTexture(slotName, this._textures[slotName]);
            }

            for (var uniformName in this._uniforms) {
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length - 1) == ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
            }

            pass.setUniform("hx_transparencyMode", this._transparencyMode / 0xff);
        }

        this.onChange.dispatch();
    },

    hasPass: function (type)
    {
        return !!this._passes[type];
    },

    setTexture: function(slotName, texture)
    {
        this._textures[slotName] = texture;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTexture(slotName, texture);
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniform: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name))
            return;

        this._uniforms[name] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniformArray: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name + '[0]'))
            return;

        this._uniforms[name + '[0]'] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    },

    _setUseSkinning: function(value)
    {
        this._useSkinning = value;
    },

    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }

};
/**
 * AssetLoader allows loading of any sort of asset. It can be used to load several assets, but onComplete and onFail will be called for each. Use BulkAssetLoader if onComplete should only be called once.
 * @param ImporterType The type of importer to use for the asset. For example: HX.JPG, HX.HCM (material), HX.OBJ, ... Must be am Importer subtype.
 * @constructor
 */
HX.AssetLoader = function(ImporterType)
{
    // this can either be listened to, or overwritten by a function
    this.onComplete = new HX.Signal();
    this.onFail = new HX.Signal();
    this.fileMap = {};
    this.options = {};
    this._importerType = ImporterType;
};

HX.AssetLoader.prototype =
{
    load: function (filename, target)
    {
        function fail(code) {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (this.onFail) {
                if (this.onFail instanceof HX.Signal)
                    this.onFail.dispatch(code);
                else
                    this.onFail(code);
            }
        }

        var importer = new this._importerType();
        target = target || importer.createContainer();
        importer.onComplete = this.onComplete;
        importer.onFail = this.onFail;
        importer.fileMap = this.fileMap;
        importer.options = this.options;
        var file = HX.FileUtils.extractPathAndFilename(filename);
        importer.path = file.path;
        importer.filename = file.filename;

        if (importer.dataType === HX.Importer.TYPE_IMAGE) {
            var image = new Image();
            image.onload = function() {
                importer.parse(image, target);
            };

            image.onError = function() {
                console.warn("Failed loading texture '" + filename + "'");
                if (onError) onError();
            };
            image.src = filename;
        }
        else {
            var urlLoader = new HX.URLLoader();
            urlLoader.type = importer.dataType;

            urlLoader.onComplete = function (data)
            {
                importer.parse(data, target);
            };

            urlLoader.onError = function (code)
            {
                fail(code);
            };

            urlLoader.load(filename);
        }

        return target;
    }
};

HX.Importer = function(containerType, dataType)
{
    this._dataType = dataType === undefined? HX.URLLoader.DATA_TEXT : dataType;
    this._containerType = containerType;
    this.onComplete = null;
    this.onFail = null;
    this.fileMap = null;
    // be able to pass importer specific settings
    this.options = {};
    this.path = "";
    this.filename = "";
};

HX.Importer.prototype =
{
    get dataType() { return this._dataType; },
    createContainer: function() { return new this._containerType(); },

    parse: function(data, target) {},

    _notifyComplete: function(asset)
    {
        if (!this.onComplete) return;

        if (this.onComplete instanceof HX.Signal)
            this.onComplete.dispatch(asset);
        else
            this.onComplete(asset);
    },

    _notifyFailure: function(message)
    {
        if (this.onFail instanceof HX.Signal) {
            if (!this.onFail.hasListeners) {
                console.error(message);
            }
            this.onFail.dispatch(message);
        }
        else
            this.onFail(message);
    },

    _correctURL: function(url)
    {
        return this.path + (this.fileMap.hasOwnProperty(url)? this.fileMap[url] : url).replace("\\", "/");
    }
};

HX.Importer.TYPE_TEXT = HX.URLLoader.DATA_TEXT;
HX.Importer.TYPE_BINARY = HX.URLLoader.DATA_BINARY;
HX.Importer.TYPE_IMAGE = 2;
// basic version is non-hierarchical, for use with lights etc
/**
 *
 * @constructor
 */
HX.SceneNode = function()
{
    HX.Transform.call(this);
    this._name = null;
    this._worldMatrix = new HX.Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._scene = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;
    this._visible = true;

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
};

HX.SceneNode.prototype = Object.create(HX.Transform.prototype);

Object.defineProperties(HX.SceneNode.prototype, {
    name: {
        get: function()
        {
            return this._name;
        },
        set: function(value)
        {
            this._name = value;
        }
    },

    visible: {
        get: function()
        {
            return this._visible;
        },
        set: function(value)
        {
            this._visible = value;
        }
    },

    worldBounds: {
        get: function()
        {
            if (this._worldBoundsInvalid) {
                this._updateWorldBounds();
                this._worldBoundsInvalid = false;
            }

            return this._worldBounds;
        }
    },

    worldMatrix: {
        get: function()
        {
            if (this._worldMatrixInvalid)
                this._updateWorldMatrix();

            return this._worldMatrix;
        }
    },

    showDebugBounds: {
        get: function ()
        {
            return this._debugBounds !== null
        },
        set: function(value)
        {
            if (!!this._debugBounds === value) return;

            if (value) {
                this._debugBounds = this._worldBounds.getDebugModelInstance();
                this._updateDebugBounds();
            }
            else
                this._debugBounds = null;
        }
    }
});

HX.SceneNode.prototype._applyMatrix = function()
{
    HX.Transform.prototype._applyMatrix.call(this);
    this._invalidateWorldMatrix();
};

HX.SceneNode.prototype.findMaterialByName = function(name)
{
    var visitor = new HX.MaterialQueryVisitor(name);
    this.acceptVisitor(visitor);
    return visitor.foundMaterial;
};

HX.SceneNode.prototype.findNodeByName = function(name)
{
    return this._name === name? this : null;
};

HX.SceneNode.prototype._setScene = function(scene)
{
    this._scene = scene;
};

HX.SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);
};

HX.SceneNode.prototype._invalidateMatrix = function ()
{
    HX.Transform.prototype._invalidateMatrix.call(this);
    this._invalidateWorldMatrix();
};

HX.SceneNode.prototype._invalidateWorldMatrix = function ()
{
    this._worldMatrixInvalid = true;
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._invalidateWorldBounds = function ()
{
    if (this._worldBoundsInvalid) return;

    this._worldBoundsInvalid = true;

    if (this._parent)
        this._parent._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldBounds = function ()
{
    if (this._debugBounds)
        this._updateDebugBounds();
};

HX.SceneNode.prototype._updateDebugBounds = function()
{
    var matrix = this._debugBounds.matrix;
    var bounds = this._worldBounds;

    console.log(bounds._halfExtentX, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);

    matrix.fromScale(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._center);
    this._debugBounds.matrix = matrix;
};

HX.SceneNode.prototype._updateMatrix = function()
{
    HX.Transform.prototype._updateMatrix.call(this);
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldMatrix = function()
{
    if (this._parent)
        this._worldMatrix.multiply(this._parent.worldMatrix, this.matrix);
    else
        this._worldMatrix.copyFrom(this.matrix);

    this._worldMatrixInvalid = false;
};

// override for better matches
HX.SceneNode.prototype._createBoundingVolume = function()
{
    return new HX.BoundingAABB();
};

HX.SceneNode.prototype.toString = function()
{
    return "[SceneNode(name=" + this._name + ")]";
};
HX.Component = function()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
};

HX.Component.prototype =
{
    // to be overridden:
    onAdded: function() {},
    onRemoved: function() {},

    // by default, onUpdate is not implemented at all
    //onUpdate: function(dt) {},
    onUpdate: null,

    get entity()
    {
        return this._entity;
    }
};
HX.Entity = function()
{
    HX.SceneNode.call(this);

    // components
    this._components = null;
    this._requiresUpdates = false;
    this._onRequireUpdatesChange = new HX.Signal();

    // are managed by effect components, but need to be collectable unlike others
    this._effects = null;
};

HX.Entity.create = function(components)
{
    var entity = new HX.Entity();

    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i)
            entity.addComponent(components[i]);
    }

    return entity;
};

HX.Entity.prototype = Object.create(HX.SceneNode.prototype);

HX.Entity.prototype.addComponents = function(components)
{
    for (var i = 0; i < components.length; ++i)
        this.addComponent(components[i]);
};

HX.Entity.prototype.removeComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.removeComponent(components[i]);
    }
};

HX.Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw new Error("Component already added to an entity!");

    this._components = this._components || [];

    this._components.push(component);

    this._updateRequiresUpdates(this._requiresUpdates || (!!component.onUpdate));

    component._entity = this;
    component.onAdded();
};

HX.Entity.prototype._updateRequiresUpdates = function(value)
{
    if (value !== this._requiresUpdates) {
        this._requiresUpdates = value;
        this._onRequireUpdatesChange.dispatch(this);
    }
};

HX.Entity.prototype.removeComponent = function(component)
{
    component.onRemoved();

    var requiresUpdates = false;
    var len = this._components.length;
    var j = 0;
    var newComps = [];

    // not splicing since we need to regenerate _requiresUpdates anyway by looping
    for (var i = 0; i < len; ++i) {
        var c = this._components[i];
        if (c !== component) {
            newComps[j++] = c;
            requiresUpdates = requiresUpdates || !!components.onUpdate;
        }
    }

    this._components = j === 0? null : newComps;
    component._entity = null;
    this._updateRequiresUpdates(requiresUpdates);
};

HX.Entity.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    if (this._effects)
        visitor.visitEffects(this._effects, this);
};

HX.Entity.prototype.update = function(dt)
{
    var components = this._components;
    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i) {
            var component = components[i];
            if (component.onUpdate) {
                component.onUpdate(dt);
            }
        }
    }
};

HX.Entity.prototype._registerEffect = function(effect)
{
    this._effects = this._effects || [];
    this._effects.push(effect);
};

HX.Entity.prototype._unregisterEffect = function(effect)
{
    var index = this._effects.indexOf(effect);
    this._effects.splice(index, 1);
    if (this._effects.length === 0)
        this._effects = null;
};

HX.Entity.prototype._setScene = function(scene)
{
    if (this._scene)
        this._scene.entityEngine.unregisterEntity(this);

    if (scene)
        scene.entityEngine.registerEntity(this);

    HX.SceneNode.prototype._setScene.call(this, scene);
};

/**
 * Keeps track and updates entities
 * @constructor
 */
HX.EntityEngine = function()
{
    this._updateableEntities = [];
    HX.onPreFrame.bind(this._update, this);
};

HX.EntityEngine.prototype =
{
    registerEntity: function(entity)
    {
        entity._onRequireUpdatesChange.bind(this._onEntityUpdateChange, this);
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
    },

    unregisterEntity: function(entity)
    {
        entity._onRequireUpdatesChange.unbind(this);
        if (entity._requiresUpdates)
            this._removeUpdatableEntity(entity);
    },

    _onEntityUpdateChange: function(entity)
    {
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
        else
            this._removeUpdatableEntity(entity);
    },

    _addUpdatableEntity: function(entity)
    {
        this._updateableEntities.push(entity);
    },

    _removeUpdatableEntity: function(entity)
    {
        var index = this._updateableEntities.indexOf(entity);
        this._updateableEntities.splice(index, 1);
    },

    _update: function(dt)
    {
        var entities = this._updateableEntities;
        var len = entities.length;
        for (var i = 0; i < len; ++i)
            entities[i].update(dt);
    }
};
/**
 * Subclasses must implement:
 * prototype.activate
 * prototype.prepareBatch
 * @constructor
 */
HX.Light = function ()
{
    HX.Entity.call(this);
    this._type = this.getTypeID();
    this._intensity = 3.1415;
    this._color = new HX.Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new HX.Color();
    this._castShadows = false;
    this._updateScaledIrradiance();
};

HX.Light.prototype = Object.create(HX.Entity.prototype);

HX.Light.prototype.getTypeID = function()
{
    throw new Error("Light is not registered! Be sure to pass the light type into the customLights array upon Helix initialization.");
};

HX.Light.prototype.acceptVisitor = function (visitor)
{
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

Object.defineProperties(HX.Light.prototype, {
    intensity: {
        get: function ()
        {
            return this._intensity;
        },

        set: function (value)
        {
            this._intensity = value;
            this._updateScaledIrradiance();
        }
    },

    color: {
        get: function ()
        {
            return this._color;
        },

        /**
         * Value can be hex or
         * @param value
         */
        set: function (value)
        {
            this._color = isNaN(value) ? value : new HX.Color(value);
            this._updateScaledIrradiance();
        }
    }
});

// returns the index of the FIRST UNRENDERED light
HX.Light.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    throw new Error("Abstract method!");
};

HX.Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._intensity;
};

HX.Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._intensity / Math.PI;

    if (HX.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};
HX.ShadowFilter = function()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
    this.onShaderInvalid = new HX.Signal();
};

HX.ShadowFilter.prototype =
{
    getShadowMapFormat: function()
    {
        return HX_GL.RGBA;
    },

    getShadowMapDataType: function()
    {
        return HX_GL.UNSIGNED_BYTE;
    },

    getGLSL: function()
    {
        throw new Error("Abstract method called");
    },

    getCullMode: function()
    {
        return HX.CullMode.BACK;
    },

    get blurShader()
    {
        if (!this._blurShader)
            this._blurShader = this._createBlurShader();

        return this._blurShader;
    },

    // only for those methods that use a blurShader
    get numBlurPasses()
    {
        return this._numBlurPasses;
    },

    set numBlurPasses(value)
    {
        this._numBlurPasses = value;
    },

    init: function()
    {

    },

    _createBlurShader: function()
    {

    },

    _invalidateBlurShader: function()
    {
        if (this._blurShader) {
            this._blurShader.dispose();
            this._blurShader = null;
        }
    }
};
/**
 *
 * @constructor
 */
HX.RenderItem = function()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.pass = null;
    this.camera = null;
    this.renderOrderHint = 0;

    // to store this in a linked list for pooling
    this.next = null;
};

HX.RenderItemPool = function()
{
    var head = null;
    var pool = null;

    this.getItem = function()
    {
        if (head) {
            var item = head;
            head = head.next;
            return item;
        }
        else {
            var item = new HX.RenderItemPool();
            item.next = pool;
            pool = item;
            return item;
        }
    };

    this.reset = function()
    {
        head = pool;
    };
};

/**
 *
 * @constructor
 */
HX.SceneVisitor = function()
{

};

HX.SceneVisitor.prototype =
{
    collect: function(camera, scene) {},
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};
/**
 *
 * @param type
 * @constructor
 */
HX.BoundingVolume = function(type)
{
    this._type = type;

    this._expanse = HX.BoundingVolume.EXPANSE_EMPTY;
    this._minimumX = 0.0;
    this._minimumY = 0.0;
    this._minimumZ = 0.0;
    this._maximumX = 0.0;
    this._maximumY = 0.0;
    this._maximumZ = 0.0;
    this._halfExtentX = 0.0;
    this._halfExtentY = 0.0;
    this._halfExtentZ = 0.0;
    this._center = new HX.Float4();
};

HX.BoundingVolume.EXPANSE_EMPTY = 0;
HX.BoundingVolume.EXPANSE_INFINITE = 1;
HX.BoundingVolume.EXPANSE_FINITE = 2;

HX.BoundingVolume._testAABBToSphere = function(aabb, sphere)
{
    // b = sphere var max = aabb._maximum;
    var maxX = sphere._maximumX;
    var maxY = sphere._maximumY;
    var maxZ = sphere._maximumZ;
    var minX = aabb._minimumX;
    var minY = aabb._minimumY;
    var minZ = aabb._minimumZ;
    var radius = sphere._halfExtentX;
    var centerX = this._center.x;
    var centerY = this._center.y;
    var centerZ = this._center.z;
    var dot = 0;

    if (minX > centerX) {
        var diff = centerX - minX;
        dot += diff * diff;
    }
    else if (maxX < centerX) {
        var diff = centerX - maxX;
        dot += diff * diff;
    }

    if (minY > centerY) {
        var diff = centerY - minY;
        dot += diff * diff;
    }
    else if (maxY < centerY) {
        var diff = centerY - maxY;
        dot += diff * diff;
    }

    if (minZ > centerZ) {
        var diff = centerZ - minZ;
        dot += diff * diff;
    }
    else if (maxZ < centerZ) {
        var diff = centerZ - maxZ;
        dot += diff * diff;
    }

    return dot < radius * radius;
};

HX.BoundingVolume.prototype =
{
    get expanse() { return this._expanse; },
    get type() { return this._type; },

    growToIncludeMesh: function(meshData) { throw new Error("Abstract method!"); },
    growToIncludeBound: function(bounds) { throw new Error("Abstract method!"); },
    growToIncludeMinMax: function(min, max) { throw new Error("Abstract method!"); },

    clear: function(expanseState)
    {
        this._minimumX = this._minimumY = this._minimumZ = 0;
        this._maximumX = this._maximumY = this._maximumZ = 0;
        this._center.set(0, 0, 0);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = 0;
        this._expanse = expanseState === undefined? HX.BoundingVolume.EXPANSE_EMPTY : expanseState;
    },

    // both center/radius and min/max approaches are used, depending on the type, but both are required
    get minimum() { return new HX.Float4(this._minimumX, this._minimumY, this._minimumZ, 1.0); },
    get maximum() { return new HX.Float4(this._maximumX, this._maximumY, this._maximumZ, 1.0); },

    get center() { return this._center; },
    // the half-extents of the box encompassing the bounds.
    get halfExtent() { return new HX.Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0); },
    // the radius of the sphere encompassing the bounds. This is implementation-dependent, because the radius is less precise for a box than for a sphere
    getRadius: function() { throw new Error("Abstract method!"); },

    transformFrom: function(sourceBound, matrix) { throw new Error("Abstract method!"); },

    /**
     * Tests whether the bounding box intersects. The convex solid is described as a list of planes pointing outward. Infinite solids are also allowed (Directional Light frusta without a near plane, for example)
     * @param cullPlanes An Array of planes to be tested. Planes are simply Float4 objects.
     * @param numPlanes The amount of planes to be tested against. This so we can test less planes than are in the cullPlanes array (Directional Light frusta, for example)
     * @returns {boolean} Whether or not the bounds intersect the solid.
     */
    intersectsConvexSolid: function(cullPlanes, numPlanes) { throw new Error("Abstract method!"); },

    intersectsBound: function(bound) { throw new Error("Abstract method!"); },
    classifyAgainstPlane: function(plane) { throw new Error("Abstract method!"); },

    createDebugModelInstance: function() { throw new Error("Abstract method!"); },

    getDebugModelInstance: function()
    {
        if (this._type._debugModel === undefined)
            this._type._debugModel = this.createDebugModelInstance();

        return this._type._debugModel;
    },

    getDebugMaterial: function()
    {
        if (HX.BoundingVolume._debugMaterial === undefined) {
            var material = new HX.Material();
            var shader = new HX.Shader(HX.ShaderLibrary.get("debug_bounds_vertex.glsl"), HX.ShaderLibrary.get("debug_bounds_fragment.glsl"));
            var materialPass = new HX.MaterialPass(shader);
            materialPass.elementType = HX.ElementType.LINES;
            materialPass.cullMode = HX.CullMode.NONE;
            material.setPass(HX.MaterialPass.GEOMETRY_PASS, materialPass);
            material.setUniform("color", new HX.Color(1.0, 0.0, 1.0));
            HX.BoundingVolume._debugMaterial = material;
        }

        return HX.BoundingVolume._debugMaterial;
    },

    toString: function()
    {
        return "BoundingVolume: [ " +
            this._minimumX + ", " +
            this._minimumY + ", " +
            this._minimumZ + " ] - [ " +
            this._maximumX + ", " +
            this._maximumY + ", " +
            this._maximumZ + " ], expanse: " +
            this._expanse;
    }
};
/**
 *
 * @constructor
 */
HX.SkeletonBlendNode = function()
{
    this._rootJointDeltaPosition = new HX.Float4();
    this._valueID = null;
    this._pose = new HX.SkeletonPose();
    this._rootPosition = new HX.Float4();
};

HX.SkeletonBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt)
    {
    },

    setValue: function(id, value)
    {
        if (this._valueID == id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },
    get numJoints() { return -1; },

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};
/**
 * @constructor
 */
HX.EffectPass = function(vertexShader, fragmentShader)
{
    vertexShader = vertexShader || HX.ShaderLibrary.get("default_post_vertex.glsl");
    var shader = new HX.Shader(vertexShader, fragmentShader);
    HX.MaterialPass.call(this, shader);
    this._uniformSetters = HX.UniformSetter.getSetters(this._shader);
    this._gbuffer = null;
    this._vertexLayout = null;
    this._cullMode = HX.CullMode.NONE;
    this._depthTest = HX.Comparison.DISABLED;
    this._writeDepth = false;
    this.setMesh(HX.RectMesh.DEFAULT);

    this.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.EffectPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh === mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new HX.VertexLayout(this._mesh, this);
};

HX.EffectPass.prototype.updateRenderState = function(renderer)
{
    this._shader.updateRenderState(renderer._camera);

    HX.MaterialPass.prototype.updateRenderState.call(this, renderer);

    this._mesh._vertexBuffers[0].bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        HX_GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX_GL.FLOAT, false, attribute.stride, attribute.offset);
    }

    HX.enableAttributes(layout._numAttributes);
};


/**
 *
 * @constructor
 */
HX.Effect = function()
{
    HX.Component.call(this);
    this._isSupported = true;
    this._mesh = null;
    this._outputsGamma = false;
};

HX.Effect.prototype = Object.create(HX.Component.prototype);

HX.Effect.prototype.isSupported = function()
{
    return this._isSupported;
};

HX.Effect.prototype.render = function(renderer, dt)
{
    this._renderer = renderer;
    this.draw(dt);
};

HX.Effect.prototype.draw = function(dt)
{
    throw new Error("Abstract method error!");
};

HX.Effect.prototype._drawPass = function(pass)
{
    pass.updateRenderState(this._renderer);
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.Effect.prototype.onAdded = function()
{
    this._entity._registerEffect(this);
};

HX.Effect.prototype.onRemoved = function()
{
    this._entity._unregisterEffect(this);
};

/**
 * Used when we need to current render target as a source.
 */
HX.Effect.prototype._swapHDRBuffers = function()
{
    this._renderer._swapHDRFrontAndBack();
};
HX.GLSLIncludeGeneral =
    "precision highp float;\n\n" +
    HX.ShaderLibrary.get("snippets_general.glsl") + "\n\n";

HX.GLSLIncludeGeometryPass = "\n" + HX.ShaderLibrary.get("snippets_geometry_pass.glsl") + "\n";
/**
 *
 * @type {{}}
 */
HX.TextureSetter = {};

HX.TextureSetter.getSetters = function(materialPass) {
    if (HX.TextureSetter._table === undefined)
        HX.TextureSetter._init();

    return HX.TextureSetter._findSetters(materialPass);
};

HX.TextureSetter._findSetters = function(materialPass)
{
    var setters = [];
    for (var slotName in HX.TextureSetter._table) {
        var slot = materialPass.getTextureSlot(slotName);
        if (slot == null) continue;
        var setter = new HX.TextureSetter._table[slotName]();
        setters.push(setter);
        setter.slot = slot;
    }

    return setters;
};


HX.TextureSetter._init = function()
{
    HX.TextureSetter._table = {};

    HX.TextureSetter._table.hx_gbufferColor = HX.GBufferColorSetter;
    HX.TextureSetter._table.hx_gbufferNormals = HX.GBufferNormalsSetter;
    HX.TextureSetter._table.hx_gbufferSpecular = HX.GBufferSpecularSetter;
    HX.TextureSetter._table.hx_gbufferDepth = HX.GBufferDepthSetter;
    HX.TextureSetter._table.hx_backbuffer = HX.BackbufferSetter;
    HX.TextureSetter._table.hx_frontbuffer = HX.FrontbufferSetter;
};


HX.GBufferColorSetter = function()
{
};

HX.GBufferColorSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer[0];
};


HX.GBufferNormalsSetter = function()
{
};

HX.GBufferNormalsSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer[1];
};


HX.GBufferSpecularSetter = function()
{
};

HX.GBufferSpecularSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer[2];
};


HX.GBufferDepthSetter = function()
{
};

HX.GBufferDepthSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer[3];
};


HX.FrontbufferSetter = function()
{
};

HX.FrontbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrFront)
        this.slot.texture = renderer._hdrFront.texture;
};


HX.BackbufferSetter = function()
{
};

HX.BackbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};
/**
 *
 * @type {{}}
 */
HX.UniformSetter = {};

HX.UniformSetter.getSetters = function(shader) {
    if (HX.UniformSetter._table === undefined)
        HX.UniformSetter._init();

    return HX.UniformSetter._findSetters(shader);
};

HX.UniformSetter._findSetters = function(shader)
{
    var setters = [];
    for (var uniformName in HX.UniformSetter._table) {
        var location = HX_GL.getUniformLocation(shader._program, uniformName);
        if (location == null) continue;
        var setter = new HX.UniformSetter._table[uniformName]();
        setters.push(setter);
        setter.location = location;
    }

    return setters;
};

HX.UniformSetter._init = function()
{
    HX.UniformSetter._table = {};

    HX.UniformSetter._table.hx_worldMatrix = HX.WorldMatrixSetter;
    HX.UniformSetter._table.hx_worldViewMatrix = HX.WorldViewMatrixSetter;
    HX.UniformSetter._table.hx_wvpMatrix = HX.WorldViewProjectionSetter;
    HX.UniformSetter._table.hx_viewMatrix = HX.ViewMatrixSetter;
    HX.UniformSetter._table.hx_projectionMatrix = HX.ProjectionSetter;
    HX.UniformSetter._table.hx_inverseProjectionMatrix = HX.InverseProjectionSetter;
    HX.UniformSetter._table.hx_inverseWVPMatrix = HX.InverseWVPSetter;
    HX.UniformSetter._table.hx_viewProjectionMatrix = HX.ViewProjectionSetter;
    HX.UniformSetter._table.hx_inverseViewProjectionMatrix = HX.InverseViewProjectionSetter;
    HX.UniformSetter._table.hx_normalWorldMatrix = HX.NormalWorldMatrixSetter;
    HX.UniformSetter._table.hx_normalWorldViewMatrix = HX.NormalWorldViewMatrixSetter;
    HX.UniformSetter._table.hx_cameraWorldPosition = HX.CameraWorldPosSetter;
    HX.UniformSetter._table.hx_cameraWorldMatrix = HX.CameraWorldMatrixSetter;
    HX.UniformSetter._table.hx_cameraFrustumRange = HX.CameraFrustumRangeSetter;
    HX.UniformSetter._table.hx_rcpCameraFrustumRange = HX.RCPCameraFrustumRangeSetter;
    HX.UniformSetter._table.hx_cameraNearPlaneDistance = HX.CameraNearPlaneDistanceSetter;
    HX.UniformSetter._table.hx_cameraFarPlaneDistance = HX.CameraFarPlaneDistanceSetter;
    HX.UniformSetter._table.hx_renderTargetResolution = HX.RenderTargetResolutionSetter;
    HX.UniformSetter._table.hx_rcpRenderTargetResolution = HX.RCPRenderTargetResolutionSetter;
    HX.UniformSetter._table.hx_dither2DTextureScale = HX.Dither2DTextureScaleSetter;
    HX.UniformSetter._table["hx_skinningMatrices[0]"] = HX.SkinningMatricesSetter;
    HX.UniformSetter._table["hx_poissonDisk[0]"] = HX.PoissonDiskSetter;
};


HX.WorldMatrixSetter = function()
{
};

HX.WorldMatrixSetter.prototype.execute = function (camera, renderItem)
{
    HX_GL.uniformMatrix4fv(this.location, false, renderItem.worldMatrix._m);
};


HX.ViewProjectionSetter = function()
{
};

HX.ViewProjectionSetter.prototype.execute = function(camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.viewProjectionMatrix._m);
};

HX.InverseViewProjectionSetter = function()
{
};

HX.InverseViewProjectionSetter.prototype.execute = function(camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.inverseViewProjectionMatrix._m);
};

HX.InverseWVPSetter = function()
{
};

HX.InverseWVPSetter.prototype.execute = function(camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.inverseViewProjectionMatrix._m);
};

HX.ProjectionSetter = function()
{
};

HX.ProjectionSetter.prototype.execute = function(camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.projectionMatrix._m);
};

HX.InverseProjectionSetter = function()
{
};

HX.InverseProjectionSetter.prototype.execute = function(camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.inverseProjectionMatrix._m);
};

HX.WorldViewProjectionSetter = function()
{
};

HX.WorldViewProjectionSetter.prototype.execute = function()
{
    var matrix = new HX.Matrix4x4();
    var m = matrix._m;
    return function(camera, renderItem)
    {
        matrix.multiply(camera.viewProjectionMatrix, renderItem.worldMatrix);
        HX_GL.uniformMatrix4fv(this.location, false, m);
    };
}();

HX.WorldViewMatrixSetter = function()
{
    this._matrix = new HX.Matrix4x4();
};

HX.WorldViewMatrixSetter.prototype.execute = function(){
    var matrix = new HX.Matrix4x4();
    var m = matrix._m;
    return function (camera, renderItem)
    {
        matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        HX_GL.uniformMatrix4fv(this.location, false, m);
    }
}();


HX.NormalWorldMatrixSetter = function()
{
};

HX.NormalWorldMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    return function (camera, renderItem)
    {
        renderItem.worldMatrix.writeNormalMatrix(data);
        HX_GL.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();


HX.NormalWorldViewMatrixSetter = function()
{
};

HX.NormalWorldViewMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    //var matrix = new HX.Matrix4x4();

    return function (camera, renderItem)
    {
        // the following code is the same as the following two lines, but inlined and reducing the need for all field to be multiplied
        //matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        //matrix.writeNormalMatrix(data);

        var am = camera.viewMatrix._m;
        var bm = renderItem.worldMatrix._m;

        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];

        var m0 = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        var m1 = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        var m2 = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        var m4 = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        var m5 = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        var m6 = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        var m8 = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        var m9 = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        var m10 = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        data[0] = (m5 * m10 - m9 * m6) * rcpDet;
        data[1] = (m8 * m6 - m4 * m10) * rcpDet;
        data[2] = (m4 * m9 - m8 * m5) * rcpDet;
        data[3] = (m9 * m2 - m1 * m10) * rcpDet;
        data[4] = (m0 * m10 - m8 * m2) * rcpDet;
        data[5] = (m8 * m1 - m0 * m9) * rcpDet;
        data[6] = (m1 * m6 - m5 * m2) * rcpDet;
        data[7] = (m4 * m2 - m0 * m6) * rcpDet;
        data[8] = (m0 * m5 - m4 * m1) * rcpDet;

        HX_GL.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();

HX.CameraWorldPosSetter = function()
{
};

HX.CameraWorldPosSetter.prototype.execute = function (camera)
{
    var arr = camera.worldMatrix._m;
    HX_GL.uniform3f(this.location, arr[12], arr[13], arr[14]);
};

HX.CameraWorldMatrixSetter = function()
{
};

HX.CameraWorldMatrixSetter.prototype.execute = function (camera)
{
    var matrix = camera.worldMatrix;
    HX_GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.CameraFrustumRangeSetter = function()
{
};

HX.CameraFrustumRangeSetter.prototype.execute = function (camera)
{
    HX_GL.uniform1f(this.location, camera._farDistance - camera._nearDistance);
};

HX.RCPCameraFrustumRangeSetter = function()
{
};

HX.RCPCameraFrustumRangeSetter.prototype.execute = function (camera)
{
    HX_GL.uniform1f(this.location, 1.0 / (camera._farDistance - camera._nearDistance));
};

HX.CameraNearPlaneDistanceSetter = function()
{
};

HX.CameraNearPlaneDistanceSetter.prototype.execute = function (camera)
{
    HX_GL.uniform1f(this.location, camera._nearDistance);
};

HX.CameraFarPlaneDistanceSetter = function()
{
};

HX.CameraFarPlaneDistanceSetter.prototype.execute = function (camera)
{
    HX_GL.uniform1f(this.location, camera._farDistance);
};

HX.ViewMatrixSetter = function()
{
};

HX.ViewMatrixSetter.prototype.execute = function (camera)
{
    HX_GL.uniformMatrix4fv(this.location, false, camera.viewMatrix._m);
};

HX.RenderTargetResolutionSetter = function()
{
};

HX.RenderTargetResolutionSetter.prototype.execute = function (camera)
{
    HX_GL.uniform2f(this.location, camera._renderTargetWidth, camera._renderTargetHeight);
};

HX.RCPRenderTargetResolutionSetter = function()
{
};

HX.RCPRenderTargetResolutionSetter.prototype.execute = function (camera)
{
    HX_GL.uniform2f(this.location, 1.0/camera._renderTargetWidth, 1.0/camera._renderTargetHeight);
};

HX.Dither2DTextureScaleSetter = function()
{
};

HX.Dither2DTextureScaleSetter.prototype.execute = function (camera)
{
    HX_GL.uniform2f(this.location, camera._renderTargetWidth / HX.DEFAULT_2D_DITHER_TEXTURE.width, camera._renderTargetHeight / HX.DEFAULT_2D_DITHER_TEXTURE.height);
};

HX.PoissonDiskSetter = function()
{
};

HX.PoissonDiskSetter.prototype.execute = function ()
{
    HX_GL.uniform2fv(this.location, HX.PoissonDisk.DEFAULT_FLOAT32);
};

HX.SkinningMatricesSetter = function()
{
    this._data = new Float32Array(64 * 16);
};

HX.SkinningMatricesSetter.prototype.execute = function (camera, renderItem)
{
    var skeleton = renderItem.skeleton;

    if (skeleton) {
        var matrices = renderItem.skeletonMatrices;
        var numJoints = skeleton.numJoints;
        var j = 0;
        for (var i = 0; i < numJoints; ++i) {
            matrices[i].writeData(this._data, j);
            j += 16;
        }
        HX_GL.uniformMatrix4fv(this.location, false, this._data);
    }
};

/**
 * PBRMaterial is a default physically plausible rendering material.
 * @constructor
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._passesInvalid = true;
    this._color = new HX.Color(1, 1, 1, 1);
    this._colorMap = null;
    this._doubleSided = false;
    this._normalMap = null;
    this._specularMap = null;
    this._maskMap = null;
    this._specularMapMode = HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = 0.0;
    this._alpha = 1.0;
    this._minRoughness = 0.3;
    this._maxRoughness = 1.0;
    this._specularNormalReflection = 0.027;
    this._alphaThreshold = 1.0;
    this._useVertexColors = false;

    // trigger assignments
    this.color = this._color;
    this.alpha = this._alpha;
    this.metallicness = this._metallicness;
    this.setRoughness(this._minRoughness);
    this.specularNormalReflection = this._specularNormalReflection;
};

HX.PBRMaterial.roughnessFromShininess = function(specularPower)
{
    return Math.sqrt(2.0/(specularPower + 2.0));
};

/**
 * used for specularMapMode to specify the specular map only uses roughness data
 */
HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
HX.PBRMaterial.SPECULAR_MAP_ALL = 2;
/**
 * used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
HX.PBRMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;


HX.PBRMaterial.prototype = Object.create(HX.Material.prototype,
    {
        doubleSided: {
            get: function()
            {
                return this._doubleSided;
            },

            set: function(value)
            {
                this._doubleSided = value;

                for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
                    if (this._passes[i])
                        this._passes[i].cullMode = value ? HX.CullMode.NONE : HX.CullMode.BACK;
                }
            }
        },

        // only used with TransparencyMode.ALPHA
        alpha: {
            get: function ()
            {
                return this._alpha;
            },
            set: function (value)
            {
                this._alpha = HX.saturate(value);
                this.setUniform("alpha", this._alpha);
            }
        },

        // this can ONLY be used if the MeshData was created with a hx_vertexColor attribute!
        useVertexColors: {
            get: function ()
            {
                return this._useVertexColors;
            },
            set: function (value)
            {
                if (this._useVertexColors !== value)
                    this._passesInvalid = true;

                this._useVertexColors = value;
            }
        },

        color: {
            get: function ()
            {
                return this._color;
            },
            set: function (value)
            {
                this._color = isNaN(value) ? value : new HX.Color(value);
                this.setUniform("color", this._color);
            }
        },

        colorMap: {
            get: function ()
            {
                return this._colorMap;
            },
            set: function (value)
            {
                if (!!this._colorMap !== !!value)
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("colorMap", value);

                this._colorMap = value;
            }
        },

        normalMap: {
            get: function ()
            {
                return this._normalMap;
            },
            set: function (value)
            {
                if (!!this._normalMap !== !!value)
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("normalMap", value);

                this._normalMap = value;
            }
        },

        /**
         * The roughness in the specular map is encoded as shininess; ie: lower values result in higher roughness to reflect the apparent brighness of the reflection. This is visually more intuitive.
         */
        specularMap: {
            get: function ()
            {
                return this._specularMap;
            },
            set: function (value)
            {
                if (!!this._specularMap !== !!value)
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("specularMap", value);

                this._specularMap = value;
            }
        },

        maskMap: {
            get: function ()
            {
                return this._maskMap;
            },
            set: function (value)
            {
                if (!!this._maskMap !== !!value)
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("maskMap", value);

                this._maskMap = value;
            }
        },

        specularMapMode: {
            get: function ()
            {
                return this._specularMapMode;
            },
            set: function (value)
            {
                if (this._specularMapMode != value)
                    this._passesInvalid = true;

                this._specularMapMode = value;
            }
        },

        metallicness: {
            get: function ()
            {
                return this._metallicness;
            },
            set: function (value)
            {
                this._metallicness = HX.saturate(value);
                this.setUniform("metallicness", this._metallicness);
            }
        },

        specularNormalReflection: {
            get: function ()
            {
                return this._specularNormalReflection;
            },
            set: function (value)
            {
                this._specularNormalReflection = HX.saturate(value);
                this.setUniform("specularNormalReflection", this._specularNormalReflection);
            }
        },

        minRoughness:
        {
            get: function ()
            {
                return this._minRoughness;
            },

            set: function(value)
            {
                this._minRoughness = value;
                this.setUniform("minRoughness", this._minRoughness);
            }
        },

        maxRoughness:
        {
            get: function ()
            {
                return this._maxRoughness;
            },

            set: function(value)
            {
                this._maxRoughness = value;
                this.setUniform("minRoughness", this._minRoughness);
            }
        },

        alphaThreshold:
        {
            get: function() { return this._alphaThreshold; },
            set: function(value) {
                value = HX.saturate(value);
                if ((this._alphaThreshold === 1.0) != (value === 1.0))
                    this._passesInvalid = true;
                this._alphaThreshold = value;
                this.setUniform("alphaThreshold", value);
            }
        }
    }
);

HX.PBRMaterial.prototype.setRoughness = function(min, max)
{
    this.minRoughness = min;
    this.maxRoughness = max || 1.0;
};

HX.PBRMaterial.prototype.getPass = function(type)
{
    if (this._passesInvalid)
        this._updatePasses();

    return HX.Material.prototype.getPass.call(this, type);
};

HX.PBRMaterial.prototype._clearPasses = function()
{
    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this.setPass(i, null);
};

HX.PBRMaterial.prototype._updatePasses = function()
{
    this._clearPasses();

    var colorDefines = this._generateColorDefines();
    var normalDefines = this._generateNormalDefines();
    var specularDefines = this._generateSpecularDefines();
    var linearDepthDefines = "";
    var generalDefines = this._generateGeneralDefines();

    if (HX.EXT_DRAW_BUFFERS) {
        var defines = colorDefines + normalDefines + specularDefines + linearDepthDefines + generalDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        colorDefines = "#define HX_NO_MRT_GBUFFER_COLOR\n" + colorDefines + generalDefines;
        normalDefines = "#define HX_NO_MRT_GBUFFER_NORMALS\n" + normalDefines + generalDefines;
        specularDefines = "#define HX_NO_MRT_GBUFFER_SPECULAR\n" + specularDefines + generalDefines;
        linearDepthDefines = "#define HX_NO_MRT_GBUFFER_LINEAR_DEPTH\n" + linearDepthDefines + generalDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_COLOR_PASS, colorDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        if (!HX.EXT_DEPTH_TEXTURE)
            this._initPass(HX.MaterialPass.GEOMETRY_LINEAR_DEPTH_PASS, linearDepthDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    // need to initialize shadow map pass if its index is not -1
    var defines = "#define HX_SHADOW_DEPTH_PASS\n" + generalDefines;
    this._initPass(HX.MaterialPass.SHADOW_DEPTH_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");

    this.setUniform("color", this._color);
    this.setUniform("alpha", this._alpha);
    this.setUniform("alphaThreshold", this._alphaThreshold);

    this.setUniform("maxRoughness", this._maxRoughness);
    this.setUniform("minRoughness", this._minRoughness);

    if (this._colorMap) this.setTexture("colorMap", this._colorMap);
    if (this._normalMap) this.setTexture("normalMap", this._normalMap);
    if (this._specularMap) this.setTexture("specularMap", this._specularMap);

    this._passesInvalid = false;
};

HX.PBRMaterial.prototype._generateColorDefines = function()
{
    var str = "";
    if (this._colorMap) str += "#define COLOR_MAP\n";
    if (this._useVertexColors) str += "#define VERTEX_COLORS\n";
    return str;
};

HX.PBRMaterial.prototype._generateNormalDefines = function()
{
    return !!this._normalMap? "#define NORMAL_MAP\n" : "";
};

HX.PBRMaterial.prototype._generateGeneralDefines = function()
{
    var defines = "";
    if (this._maskMap) defines += "#define MASK_MAP\n";
    if (this._alphaThreshold < 1.0) defines += "#define ALPHA_THRESHOLD\n";
    if (this._useSkinning) defines += "#define USE_SKINNING\n";
    return defines;
};

HX.PBRMaterial.prototype._generateSpecularDefines = function()
{
    switch (this._specularMapMode) {
        case HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            return this._specularMap? "#define ROUGHNESS_MAP\n" : "";
        case HX.PBRMaterial.SPECULAR_MAP_ALL:
            return this._specularMap? "#define SPECULAR_MAP\n" : "";
        default:
            return "#define NORMAL_ROUGHNESS_MAP\n";
    }
};

HX.PBRMaterial.prototype._initPass = function(type, defines, vertexShaderID, fragmentShaderID)
{
    var vertexShader = defines + HX.ShaderLibrary.get(vertexShaderID);
    var fragmentShader = defines + HX.GLSLIncludeGeometryPass + HX.ShaderLibrary.get(fragmentShaderID);
    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.cullMode = this._doubleSided? HX.CullMode.NONE : HX.CullMode.BACK;
    this.setPass(type, pass);
};

HX.PBRMaterial.prototype._setUseSkinning = function(value)
{
    if (this._useSkinning !== value)
        this._passesInvalid = true;

    this._useSkinning = value;
};
/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.GLSLIncludeGeometryPass + HX.ShaderLibrary.get("default_skybox_fragment.glsl");

    if (!HX.EXT_DRAW_BUFFERS)
        fragmentShader = "#define HX_NO_MRT_GBUFFER_COLOR\n" + fragmentShader;

    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.writeDepth = false;
    pass.cullMode = HX.CullMode.NONE;
    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(HX.MaterialPass.GEOMETRY_PASS, pass);

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);
/**
 *
 * @constructor
 */
HX.TextureSlot = function() {
    this.location = -1;
    this.texture = null;
    this.name = null;   // for debugging
};
/**
 *
 * @constructor
 */
HX.BoundingAABB = function()
{
    HX.BoundingVolume.call(this, HX.BoundingAABB);
};

HX.BoundingAABB.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingAABB.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride(attribute.streamIndex);
    var vertices = meshData.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }

    this._minimumX = minX; this._minimumY = minY; this._minimumZ = minZ;
    this._maximumX = maxX; this._maximumY = maxY; this._maximumZ = maxZ;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = bounds._minimumX;
        this._minimumY = bounds._minimumY;
        this._minimumZ = bounds._minimumZ;
        this._maximumX = bounds._maximumX;
        this._maximumY = bounds._maximumY;
        this._maximumZ = bounds._maximumZ;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (bounds._minimumX < this._minimumX)
            this._minimumX = bounds._minimumX;
        if (bounds._minimumY < this._minimumY)
            this._minimumY = bounds._minimumY;
        if (bounds._minimumZ < this._minimumZ)
            this._minimumZ = bounds._minimumZ;
        if (bounds._maximumX > this._maximumX)
            this._maximumX = bounds._maximumX;
        if (bounds._maximumY > this._maximumY)
            this._maximumY = bounds._maximumY;
        if (bounds._maximumZ > this._maximumZ)
            this._maximumZ = bounds._maximumZ;
    }

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.growToIncludeMinMax = function(min, max)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = min.x;
        this._minimumY = min.y;
        this._minimumZ = min.z;
        this._maximumX = max.x;
        this._maximumY = max.y;
        this._maximumZ = max.z;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (min.x < this._minimumX)
            this._minimumX = min.x;
        if (min.y < this._minimumY)
            this._minimumY = min.y;
        if (min.z < this._minimumZ)
            this._minimumZ = min.z;
        if (max.x > this._maximumX)
            this._maximumX = max.x;
        if (max.y > this._maximumY)
            this._maximumY = max.y;
        if (max.z > this._maximumZ)
            this._maximumZ = max.z;
    }

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        this._center.z = m20 * x + m21 * y + m22 * z + arr[14];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        this._halfExtentX = m00 * x + m01 * y + m02 * z;
        this._halfExtentY = m10 * x + m11 * y + m12 * z;
        this._halfExtentZ = m20 * x + m21 * y + m22 * z;


        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;
        this._expanse = sourceBound._expanse;
    }
};


HX.BoundingAABB.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;

    for (var i = 0; i < numPlanes; ++i) {
        // find the point that will always have the smallest signed distance
        var plane = cullPlanes[i];
        var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;
        var closestX = planeX > 0? minX : maxX;
        var closestY = planeY > 0? minY : maxY;
        var closestZ = planeZ > 0? minZ : maxZ;

        // classify the closest point
        var signedDist = planeX * closestX + planeY * closestY + planeZ * closestZ + planeW;
        if (signedDist > 0.0)
            return false;
    }

    return true;
};

HX.BoundingAABB.prototype.intersectsBound = function(bound)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        return true;

    // both AABB
    if (bound._type === this._type) {
        return 	this._maximumX > bound._minimumX &&
            this._minimumX < bound._maximumX &&
            this._maximumY > bound._minimumY &&
            this._minimumY < bound._maximumY &&
            this._maximumZ > bound._minimumZ &&
            this._minimumZ < bound._maximumZ;
    }
    else {
        return HX.BoundingVolume._testAABBToSphere(this, bound);
    }
};

HX.BoundingAABB.prototype.classifyAgainstPlane = function(plane)
{
    var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = planeW;

    var centerDist = planeX * this._center.x + planeY * this._center.y + planeZ * this._center.z + planeW;

    if (planeX < 0) planeX = -planeX;
    if (planeY < 0) planeY = -planeY;
    if (planeZ < 0) planeZ = -planeZ;

    var intersectionDist = planeX * this._halfExtentX + planeY * this._halfExtentY + planeZ * this._halfExtentZ;

    if (centerDist > intersectionDist)
        return HX.PlaneSide.FRONT;
    else if (centerDist < -intersectionDist)
        return HX.PlaneSide.BACK;
    else
        return HX.PlaneSide.INTERSECTING;
};

HX.BoundingAABB.prototype.setExplicit = function(min, max)
{
    this._minimumX = min.x;
    this._minimumY = min.y;
    this._minimumZ = min.z;
    this._maximumX = max.x;
    this._maximumY = max.y;
    this._maximumZ = max.z;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype._updateCenterAndExtent = function()
{
    var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
    var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;
    this._center.x = (minX + maxX) * .5;
    this._center.y = (minY + maxY) * .5;
    this._center.z = (minZ + maxZ) * .5;
    this._halfExtentX = (maxX - minX) * .5;
    this._halfExtentY = (maxY - minY) * .5;
    this._halfExtentZ = (maxZ - minZ) * .5;
};

// part of the
HX.BoundingAABB.prototype.getRadius = function()
{
    return Math.sqrt(this._halfExtentX * this._halfExtentX + this._halfExtentY * this._halfExtentY + this._halfExtentZ * this._halfExtentZ);
};

HX.BoundingAABB.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(new HX.BoxPrimitive(), [this.getDebugMaterial()]);
};
/**
 *
 * @constructor
 */
HX.BoundingSphere = function()
{
    HX.BoundingVolume.call(this, HX.BoundingSphere);
};

HX.BoundingSphere.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingSphere.prototype.setExplicit = function(center, radius)
{
    this._center.copyFrom(center);
    this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride(attribute.streamIndex);
    var vertices = attribute.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }
    var centerX = (maxX + minX) * .5;
    var centerY = (maxY + minY) * .5;
    var centerZ = (maxZ + minZ) * .5;
    var maxSqrRadius = 0.0;

    index = attribute.offset;
    for (; index < len; index += stride) {
        var dx = centerX - vertices[index];
        var dy = centerY - vertices[index + 1];
        var dz = centerZ - vertices[index + 2];
        var sqrRadius = dx*dx + dy*dy + dz*dz;
        if (sqrRadius > maxSqrRadius) maxSqrRadius = sqrRadius;
    }

    this._center.x = centerX;
    this._center.y = centerY;
    this._center.z = centerZ;

    var radius = Math.sqrt(maxSqrRadius);
    this._halfExtentX = radius;
    this._halfExtentY = radius;
    this._halfExtentZ = radius;

    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        this._center.x = bounds._center.x;
        this._center.y = bounds._center.y;
        this._center.z = bounds._center.z;
        if (bounds._type == this._type) {
            this._halfExtentX = bounds._halfExtentX;
            this._halfExtentY = bounds._halfExtentY;
            this._halfExtentZ = bounds._halfExtentZ;
        }
        else {
            this._halfExtentX = this._halfExtentY = this._halfExtentZ = bounds.getRadius();
        }
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }

    else {
        var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
        var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;

        if (bounds._maximumX > maxX)
            maxX = bounds._maximumX;
        if (bounds._maximumY > maxY)
            maxY = bounds._maximumY;
        if (bounds._maximumZ > maxZ)
            maxZ = bounds._maximumZ;
        if (bounds._minimumX < minX)
            minX = bounds._minimumX;
        if (bounds._minimumY < minY)
            minY = bounds._minimumY;
        if (bounds._minimumZ < minZ)
            minZ = bounds._minimumZ;

        this._center.x = (minX + maxX) * .5;
        this._center.y = (minY + maxY) * .5;
        this._center.z = (minZ + maxZ) * .5;

        var dx = maxX - this._center.x;
        var dy = maxY - this._center.y;
        var dz = maxZ - this._center.z;
        var radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    }

    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeMinMax = function(min, max)
{
    // temp solution, not run-time perf critical
    var aabb = new HX.BoundingAABB();
    aabb.growToIncludeMinMax(min, max);
    this.growToIncludeBound(aabb);
};

HX.BoundingSphere.prototype.getRadius = function()
{
    return this._halfExtentX;
};

HX.BoundingSphere.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse == HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        this._center.z = m20 * x + m21 * y + m22 * z + arr[14];


        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        var hx = m00 * x + m01 * y + m02 * z;
        var hy = m10 * x + m11 * y + m12 * z;
        var hz = m20 * x + m21 * y + m22 * z;

        var radius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;

        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;

        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
};

HX.BoundingSphere.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;

    for (var i = 0; i < numPlanes; ++i) {
        var plane = cullPlanes[i];
        var signedDist = plane.x * centerX + plane.y * centerY + plane.z * centerZ + plane.w;

        if (signedDist > radius)
            return false;
    }

    return true;
};

HX.BoundingSphere.prototype.intersectsBound = function(bound)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;

    // both Spheres
    if (bound._type === this._type) {
        var dx = this._center.x - bound._center.x;
        var dy = this._center.y - bound._center.y;
        var dz = this._center.z - bound._center.z;
        var touchDistance = this._halfExtentX + bound._halfExtentX;
        return dx*dx + dy*dy + dz*dz < touchDistance*touchDistance;
    }
    else
        return HX.BoundingVolume._testAABBToSphere(bound, this);
};

HX.BoundingSphere.prototype.classifyAgainstPlane = function(plane)
{
    var dist = plane.x * this._center.x + plane.y * this._center.y + plane.z * this._center.z + plane.w;
    var radius = this._halfExtentX;
    if (dist > radius) return HX.PlaneSide.FRONT;
    else if (dist < -radius) return HX.PlaneSide.BACK;
    else return HX.PlaneSide.INTERSECTING;
};

HX.BoundingSphere.prototype._updateMinAndMax = function()
{
    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;
    this._minimumX = centerX - radius;
    this._minimumY = centerY - radius;
    this._minimumZ = centerZ - radius;
    this._maximumX = centerX + radius;
    this._maximumY = centerY + radius;
    this._maximumZ = centerZ + radius;
};

HX.BoundingSphere.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(new HX.SpherePrimitive({doubleSided:true}), [this.getDebugMaterial()]);
};
/**
 *
 * @constructor
 */
HX.Frustum = function()
{
    this._planes = new Array(6);
    this._corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this._planes[i] = new HX.Float4();

    for (var i = 0; i < 8; ++i)
        this._corners[i] = new HX.Float4();

    this._r1 = new HX.Float4();
    this._r2 = new HX.Float4();
    this._r3 = new HX.Float4();
    this._r4 = new HX.Float4();
};

HX.Frustum.PLANE_LEFT = 0;
HX.Frustum.PLANE_RIGHT = 1;
HX.Frustum.PLANE_BOTTOM = 2;
HX.Frustum.PLANE_TOP = 3;
HX.Frustum.PLANE_NEAR = 4;
HX.Frustum.PLANE_FAR = 5;

HX.Frustum.CLIP_SPACE_CORNERS = [	new HX.Float4(-1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, 1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, 1.0, 1.0)
                                ];

HX.Frustum.prototype =
{
    /**
     * An Array of planes describing frustum. The planes are in world space and point outwards.
     */
    get planes() { return this._planes; },

    /**
     * An array containing the 8 vertices of the frustum, in world space.
     */
    get corners() { return this._corners; },

    update: function(projection, inverseProjection)
    {
        this._updatePlanes(projection);
        this._updateCorners(inverseProjection);
    },

    _updatePlanes: function(projection)
    {
        // todo: this can all be inlined, but not the highest priority (only once per frame)
        var r1 = projection.getRow(0, this._r1);
        var r2 = projection.getRow(1, this._r2);
        var r3 = projection.getRow(2, this._r3);
        var r4 = projection.getRow(3, this._r4);

        HX.Float4.add(r4, r1, this._planes[HX.Frustum.PLANE_LEFT]);
        HX.Float4.subtract(r4, r1, this._planes[HX.Frustum.PLANE_RIGHT]);
        HX.Float4.add(r4, r2, this._planes[HX.Frustum.PLANE_BOTTOM]);
        HX.Float4.subtract(r4, r2, this._planes[HX.Frustum.PLANE_TOP]);
        HX.Float4.add(r4, r3, this._planes[HX.Frustum.PLANE_NEAR]);
        HX.Float4.subtract(r4, r3, this._planes[HX.Frustum.PLANE_FAR]);

        for (var i = 0; i < 6; ++i) {
            this._planes[i].negate();
            this._planes[i].normalizeAsPlane();
        }
    },

    _updateCorners: function(inverseProjection)
    {
        for (var i = 0; i < 8; ++i) {
            var corner = this._corners[i];
            inverseProjection.transform(HX.Frustum.CLIP_SPACE_CORNERS[i], corner);
            corner.scale(1.0 / corner.w);
        }
    }
};

/**
 *
 * @constructor
 */
HX.Camera = function()
{
    HX.Entity.call(this);

    this._renderTargetWidth = 0;
    this._renderTargetHeight = 0;
    this._viewProjectionMatrixInvalid = true;
    this._viewProjectionMatrix = new HX.Matrix4x4();
    this._inverseProjectionMatrix = new HX.Matrix4x4();
    this._inverseViewProjectionMatrix = new HX.Matrix4x4();
    this._projectionMatrix = new HX.Matrix4x4();
    this._viewMatrix = new HX.Matrix4x4();
    this._projectionMatrixDirty = true;
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new HX.Frustum();

    this.position.set(0.0, 0.0, 1.0);
};

HX.Camera.prototype = Object.create(HX.Entity.prototype);

Object.defineProperties(HX.Camera.prototype, {
    nearDistance: {
        get: function() {
            return this._nearDistance;
        },

        set: function(value) {
            this._nearDistance = value;
            this._invalidateProjectionMatrix();
        }
    },
    farDistance: {
        get: function() {
            return this._farDistance;
        },

        set: function(value) {
            this._farDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    viewProjectionMatrix: {
        get: function() {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewProjectionMatrix;
        }
    },

    viewMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewMatrix;
        }
    },

    projectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._projectionMatrix;
        }
    },

    inverseViewProjectionMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._inverseViewProjectionMatrix;
        }
    },

    inverseProjectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._inverseProjectionMatrix;
        }
    },

    frustum: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._frustum;
        }
    }
});

HX.Camera.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);
};

HX.Camera.prototype._setRenderTargetResolution = function(width, height)
{
    this._renderTargetWidth = width;
    this._renderTargetHeight = height;
};

HX.Camera.prototype._invalidateViewProjectionMatrix = function()
{
    this._viewProjectionMatrixInvalid = true;
};

HX.Camera.prototype._invalidateWorldMatrix = function()
{
    HX.Entity.prototype._invalidateWorldMatrix.call(this);
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateViewProjectionMatrix = function()
{
    this._viewMatrix.inverseAffineOf(this.worldMatrix);
    this._viewProjectionMatrix.multiply(this.projectionMatrix, this._viewMatrix);
    this._inverseProjectionMatrix.inverseOf(this._projectionMatrix);
    this._inverseViewProjectionMatrix.inverseOf(this._viewProjectionMatrix);
    this._frustum.update(this._viewProjectionMatrix, this._inverseViewProjectionMatrix);
    this._viewProjectionMatrixInvalid = false;
};

HX.Camera.prototype._invalidateProjectionMatrix = function()
{
    this._projectionMatrixDirty = true;
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateProjectionMatrix = function()
{
    throw new Error("Abstract method!");
};

HX.Camera.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

HX.Camera.prototype.toString = function()
{
    return "[Camera(name=" + this._name + ")]";
};

/**
 * @constructor
 */
HX.PerspectiveCamera = function ()
{
    HX.Camera.call(this);

    this._vFOV = 1.047198;  // radians!
    this._aspectRatio = 0;
};


HX.PerspectiveCamera.prototype = Object.create(HX.Camera.prototype);

Object.defineProperties(HX.PerspectiveCamera.prototype, {
    verticalFOV: {
        get: function()
        {
            return this._vFOV;
        },
        set: function(value)
        {
            this._vFOV = value;
            this._invalidateProjectionMatrix();
        }
    }
});

HX.PerspectiveCamera.prototype._setAspectRatio = function(value)
{
    if (this._aspectRatio == value) return;

    this._aspectRatio = value;
    this._invalidateProjectionMatrix();
};

HX.PerspectiveCamera.prototype._setRenderTargetResolution = function(width, height)
{
    HX.Camera.prototype._setRenderTargetResolution.call(this, width, height);
    this._setAspectRatio(width / height);
};

HX.PerspectiveCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromPerspectiveProjection(this._vFOV, this._aspectRatio, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @constructor
 */
HX.OrthographicOffCenterCamera = function ()
{
    HX.Camera.call(this);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
};

HX.OrthographicOffCenterCamera.prototype = Object.create(HX.Camera.prototype);

HX.OrthographicOffCenterCamera.prototype.setBounds = function(left, right, top, bottom)
{
    this._left = left;
    this._right = right;
    this._top = top;
    this._bottom = bottom;
    this._invalidateProjectionMatrix();
};

HX.OrthographicOffCenterCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromOrthographicOffCenterProjection(this._left, this._right, this._top, this._bottom, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};
/**
 *
 * @constructor
 */
HX.GroupNode = function()
{
    HX.SceneNode.call(this);

    // child entities (scene nodes)
    this._children = [];
};

HX.GroupNode.prototype = Object.create(HX.SceneNode.prototype,
    {
        numChildren: {
            get: function() { return this._children.length; }
        }
    });


HX.GroupNode.prototype.findNodeByName = function(name)
{
    var node = HX.SceneNode.prototype.findNodeByName.call(this, name);
    if (node) return node;
    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        node = this._children[i].findNodeByName(name);
        if (node) return node;
    }
};

HX.GroupNode.prototype.attach = function(child)
{
    if (child._parent)
        throw new Error("Child is already parented!");

    child._parent = this;
    child._setScene(this._scene);

    this._children.push(child);
    this._invalidateWorldBounds();
};

HX.GroupNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw new Error("Trying to remove a scene object that is not a child");

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

HX.GroupNode.prototype.getChild = function(index) { return this._children[index]; };

HX.GroupNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};

HX.GroupNode.prototype._invalidateWorldMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldMatrix.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldMatrix();
};

HX.GroupNode.prototype._updateWorldBounds = function()
{
    var len = this._children.length;

    for (var i = 0; i < len; ++i) {
        this._worldBounds.growToIncludeBound(this._children[i].worldBounds);
    }

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};

HX.GroupNode.prototype._setScene = function(scene)
{
    HX.SceneNode.prototype._setScene.call(this, scene);

    var len = this._children.length;

    for (var i = 0; i < len; ++i)
        this._children[i]._setScene(scene);
};
HX.MaterialQueryVisitor = function(materialName)
{
    HX.SceneVisitor.call(this);
    this._materialName = materialName;
};

HX.MaterialQueryVisitor.prototype = Object.create(HX.SceneVisitor.prototype,
    {
        foundMaterial: {
            get: function()
            {
                return this._foundMaterial;
            }
        }
    });

HX.MaterialQueryVisitor.prototype.qualifies = function(object)
{
    // if a material was found, ignore
    return !this._foundMaterial;
};

HX.MaterialQueryVisitor.prototype.visitModelInstance = function (modelInstance, worldMatrix)
{
    var materials = modelInstance._materials;
    var len = materials.length;
    for (var i = 0; i < len; ++i) {
        var material = materials[i];
        if (material.name === this._materialName)
            this._foundMaterial = material;
    }
};
/**
 * Creates a new Scene object
 * @param rootNode (optional) A rootnode to be used, allowing different partition types to be used as the root.
 * @constructor
 */
HX.Scene = function(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new HX.GroupNode();
    this._rootNode._setScene(this);
    this._skybox = null;
    this._entityEngine = new HX.EntityEngine();
};

HX.Scene.prototype = {
    constructor: HX.Scene,

    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

    // TODO: support regex for partial matches
    findNodeByName: function(name)
    {
        return this._rootNode.findNodeByName(name);
    },

    // TODO: support regex for partial matches
    findMaterialByName: function(name)
    {
        return this._rootNode.findMaterialByName(name);
    },

    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    detach: function(child)
    {
        this._rootNode.detach(child);
    },

    get numChildren()
    {
        return this._rootNode.numChildren;
    },

    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);
        // assume root node will always qualify
        this._rootNode.acceptVisitor(visitor);
    },

    get entityEngine()
    {
        return this._entityEngine;
    },

    get worldBounds()
    {
        return this._rootNode.worldBounds;
    }
};
/**
 * Skybox provides a backdrop "at infinity" for the scene.
 * @param materialOrTexture Either a texture or a material used to render the skybox. If a texture is passed,
 * HX.SkyboxMaterial is used as material.
 * @constructor
 */
HX.Skybox = function(materialOrTexture)
{
    if (!(materialOrTexture instanceof HX.Material))
        materialOrTexture = new HX.SkyboxMaterial(materialOrTexture);

    var model = new HX.PlanePrimitive({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2});
    model.localBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    this._modelInstance = new HX.ModelInstance(model, materialOrTexture);
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

// TODO: Not sure if we want to always be stuck to a skybox for global probes?
HX.Skybox.prototype =
{
    getGlobalSpecularProbe: function()
    {
        return this._globalSpecularProbe;
    },

    setGlobalSpecularProbe: function(value)
    {
        this._globalSpecularProbe = value;
    },

    getGlobalIrradianceProbe: function()
    {
        return this._globalIrradianceProbe;
    },

    setGlobalIrradianceProbe: function(value)
    {
        this._globalIrradianceProbe = value;
    }
};
HX.MeshBatch = {
    create: function(sourceMeshData, numInstances)
    {
        var len, i, j;
        var target = new HX.MeshData();
        var sourceIndices = sourceMeshData._indexData;

        target.vertexUsage = sourceMeshData.vertexUsage;
        target.indexUsage = sourceMeshData.indexUsage;

        var attribs = sourceMeshData._vertexAttributes;
        var instanceStream = sourceMeshData.numStreams;

        for (i = 0; i < attribs.length; ++i) {
            var attribute = attribs[i];
            target.addVertexAttribute(attribute.name, attribute.numComponents, attribute.streamIndex);
        }

        target.addVertexAttribute("hx_instanceID", 1, instanceStream);

        var targetIndices = [];
        var index = 0;
        var numVertices = sourceMeshData.numVertices;

        len = sourceIndices.length;

        for (i = 0; i < numInstances; ++i) {
            for (j = 0; j < len; ++j) {
                targetIndices[index++] = sourceIndices[j] + numVertices * i;
            }
        }

        target.setIndexData(targetIndices);

        for (i = 0; i < sourceMeshData.numStreams; ++i) {
            var targetVertices = [];
            var sourceVertices = sourceMeshData.getVertexData(i);

            len = sourceVertices.length;
            index = 0;

            // duplicate vertex data for each instance
            for (j = 0; j < numInstances; ++j) {
                for (var k = 0; k < len; ++k) {
                    targetVertices[index++] = sourceVertices[k];
                }
            }

            target.setVertexData(targetVertices, i);
        }

        var instanceData = [];
        index = 0;
        for (j = 0; j < numInstances; ++j) {
            for (i = 0; i < numVertices; ++i) {
                instanceData[index++] = j;
            }
        }

        // something actually IS wrong with the instance data
        // drawing an explicit subselection of indices with constant instance index is correct
        // filling the entire array with 0 doesn't help, so it looks like the data is not set correctly
        target.setVertexData(instanceData, instanceStream);

        return target;
    }
};
/**
 *
 * @constructor
 */
HX.MeshData = function ()
{
    this._vertexStrides = [];
    this._vertexData = [];
    this._indexData = undefined;
    this.vertexUsage = HX_GL.STATIC_DRAW;
    this.indexUsage = HX_GL.STATIC_DRAW;
    this._vertexAttributes = [];
    this._numStreams = 0;
};

HX.MeshData.DEFAULT_VERTEX_SIZE = 12;

// other possible indices:
// hx_instanceID (used by MeshBatch)
// hx_boneIndices (4)
// hx_boneWeights (4)
HX.MeshData.createDefaultEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    return data;
};

HX.MeshData.prototype = {
    constructor: HX.MeshData,

    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Sets data from Array
     */
    setVertexData: function (data, streamIndex)
    {
        this._vertexData[streamIndex] = new Float32Array(data);
    },

    /**
     * Sets data from Array
     */
    setIndexData: function (data)
    {
        this._indexData = new Uint16Array(data);
    },

    /**
     * Adds a named vertex attribute. All properties are given manually to make it easier to support multiple streams in the future.
     * @param name The name of the attribute, matching the attribute name used in the vertex shaders.
     * @param numComponents The amount of components used by the attribute value.
     * @param streamIndex [Optional] The stream index indicating which vertex buffer is used, defaults to 0
     */
    addVertexAttribute: function (name, numComponents, streamIndex)
    {
        streamIndex = streamIndex || 0;
        this._numStreams = Math.max(this._numStreams, streamIndex + 1);
        this._vertexStrides[streamIndex] = this._vertexStrides[streamIndex] || 0;
        this._vertexAttributes.push({
            name: name,
            offset: this._vertexStrides[streamIndex],
            numComponents: numComponents,
            streamIndex: streamIndex
        });

        this._vertexStrides[streamIndex] += numComponents;
    },

    getVertexAttribute: function (name)
    {
        var len = this._vertexAttributes.length;
        for (var i = 0; i < len; ++i) {
            if (this._vertexAttributes[i].name === name)
                return this._vertexAttributes[i];
        }
    },

    /**
     * Returns the stride of each vertex for the given stream index. This matches the total amount of elements used by all vertex attributes combined.
     */
    getVertexStride: function (streamIndex)
    {
        return this._vertexStrides[streamIndex];
    },

    get numStreams()
    {
        return this._numStreams;
    },

    get numVertices()
    {
        return this._vertexData[0].length / this._vertexStrides[0];
    }
};

/**
 *
 * @param meshData
 * @param model
 * @constructor
 */
HX.Mesh = function (meshData, model)
{
    this._model = model;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._indexBuffer = new HX.IndexBuffer();

    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;

    this.updateMeshData(meshData);
};

HX.Mesh.ID_COUNTER = 0;


HX.Mesh.prototype = {
    constructor: HX.Mesh,

    updateMeshData: function(meshData)
    {
        var numStreams = meshData.numStreams;
        var numVertexBuffers = this._vertexBuffers.length;

        if (numStreams > numVertexBuffers) {
            for (var i = numVertexBuffers; i < numStreams; ++i) {
                this._vertexBuffers[i] = new HX.VertexBuffer();
            }
        }
        else if (numStreams < numVertexBuffers) {
            this._vertexBuffers.length = numStreams;
            this._vertexStrides.length = numStreams;
        }

        for (var i = 0; i < numStreams; ++i) {
            this._vertexBuffers[i].uploadData(meshData.getVertexData(i), meshData.vertexUsage);
            this._vertexStrides[i] = meshData.getVertexStride(i);
        }

        this._numIndices = meshData._indexData.length;

        this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);
        this._vertexAttributes = meshData._vertexAttributes;
    },

    dispose: function ()
    {
        for (var i = 0; i < this._vertexBuffers.length; ++i)
            this._vertexBuffers[i].dispose();
        this._indexBuffer.dispose();
    },

    get numIndices()
    {
        return this._numIndices;
    },

    get numVertexAttributes()
    {
        return this._vertexAttributes.length;
    },

    getVertexStride: function(streamIndex)
    {
        return this._vertexStrides[streamIndex];
    },

    getVertexAttribute: function (index)
    {
        return this._vertexAttributes[index];
    }
};

/**
 *
 * @constructor
 */
HX.ModelData = function ()
{
    this._meshDataList = [];
    this._joints = [];
    this.skeleton = null;
};

HX.ModelData.prototype = {
    constructor: HX.ModelData,

    get numMeshes()
    {
        return this._meshDataList.length;
    },

    getMeshData: function (index)
    {
        return this._meshDataList[index];
    },

    addMeshData: function (meshData)
    {
        this._meshDataList.push(meshData);
    },

    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    get hasSkeleton()
    {
        return this._joints.length > 0;
    }
};

/**
 *
 * @param modelData
 * @constructor
 */
HX.Model = function (modelData)
{
    this._name = null;
    this._localBounds = new HX.BoundingAABB();
    this._skeleton = null;
    this.onChange = new HX.Signal();

    if (modelData) {
        this._meshes = null;
        this._setModelData(modelData);
    }
    else
        this._meshes = [];
};

HX.Model.prototype = {
    constructor: HX.Model,

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get numMeshes()
    {
        return this._meshes.length;
    },

    getMesh: function (index)
    {
        return this._meshes[index];
    },

    dispose: function()
    {
        if (this._meshes)
            for (var i = 0; i < this._meshes.length; ++i)
                this._meshes[i].dispose();
    },

    get localBounds()
    {
        return this._localBounds;
    },


    get skeleton()
    {
        return this._skeleton;
    },

    set skeleton(value)
    {
        this._skeleton = value;
    },

    _setModelData: function (modelData)
    {
        this.dispose();

        this._localBounds.clear();
        this._meshes = [];

        for (var i = 0; i < modelData.numMeshes; ++i) {
            var meshData = modelData.getMeshData(i);
            this._localBounds.growToIncludeMesh(meshData);
            this._meshes.push(new HX.Mesh(meshData, this));
        }

        this.skeleton = modelData.skeleton;

        this.onChange.dispatch();
    },

    toString: function()
    {
        return "[Model(name=" + this._name + ")]";
    }
};
/**
 *
 * @param mesh
 * @param pass
 * @constructor
 */
HX.VertexLayout = function(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];

    this._numAttributes = -1;

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getAttributeLocation(attribute.name);

        this._numAttributes = Math.max(this._numAttributes, index + 1);

        // convert offset and stride to bytes
        if (index >= 0) {
            var stride = mesh.getVertexStride(attribute.streamIndex);
            // convert to bytes
            this.attributes.push({
                index: index,
                offset: attribute.offset * 4,
                numComponents: attribute.numComponents,
                stride: stride * 4,
                streamIndex: attribute.streamIndex
            });
        }

    }
};

HX.VertexLayout.prototype = {
    constructor: HX.VertexLayout
};

/**
 *
 * @param mesh
 * @param material
 * @constructor
 */
HX.MeshInstance = function(mesh, material)
{
    this._mesh = mesh;
    this._meshMaterialLinkInvalid = false;
    this._vertexLayouts = null;

    this.material = material;
};

HX.MeshInstance.prototype = {
    constructor: HX.MeshInstance,

    get material()
    {
        return this._material;
    },

    set material(value)
    {
        if (this._material)
            this._material.onChange.unbind(this._onMaterialChange);

        this._material = value;

        // TODO: May want to set a default "purple" material when nothing is provided?
        if (this._material) {
            this._material.onChange.bind(this._onMaterialChange, this);

            this.material._setUseSkinning(this._material._useSkinning || !!this._mesh._model.skeleton);
        }

        this._linkMeshWithMaterial();
    },

    /**
     * Sets state for this mesh/material combination.
     * @param passType
     */
    updateRenderState: function(passType)
    {
        if (this._meshMaterialLinkInvalid)
            this._linkMeshWithMaterial();


        var vertexBuffers = this._mesh._vertexBuffers;
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var attributes = layout.attributes;
        var len = attributes.length;

        for (var i = 0; i < len; ++i) {
            var attribute = attributes[i];
            vertexBuffers[attribute.streamIndex].bind();
            HX_GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX_GL.FLOAT, false, attribute.stride, attribute.offset);
        }

        HX.enableAttributes(layout._numAttributes);
    },

    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(HX.MaterialPass.NUM_PASS_TYPES);
        for (var type = 0; type < HX.MaterialPass.NUM_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new HX.VertexLayout(this._mesh, pass);
        }
    },

    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._meshMaterialLinkInvalid = false;
    },

    _onMaterialChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};

/**
 * Creates a new ModelComponent object. ModelInstances are a given combination of a Model and a set of Materials
 * (up to 1 per Mesh). They can be reused and attached to several SceneNode objects.
 * @param model
 * @param materials Either a single material or an array of materials for each mesh in model.
 * @constructor
 */
HX.ModelInstance = function(model, materials)
{
    HX.Entity.call(this);
    this._meshBounds = new HX.BoundingAABB();
    this._model = null;
    this._meshInstances = [];
    this._castShadows = true;
    this._skeletonPose = null;

    this.init(model, materials);
};

HX.ModelInstance.prototype = Object.create(HX.Entity.prototype, {
    model:
    {
        get: function() { return this._model; }
    },

    castShadows: {
        get: function()
        {
            return this._castShadows;
        },

        set: function(value)
        {
            this._castShadows = value;
        }
    },

    numMeshInstances: {
        get: function ()
        {
            return this._meshInstances.length;
        }
    },

    skeleton: {
        get: function() {
            return this._model.skeleton;
        }
    },

    skeletonMatrices: {
        get: function() {
            return this._skeletonPose;
        },
        set: function(value) {
            this._skeletonPose = value;
        }
    }
});

/**
 * Used if we choose to deferedly initialize the model
 * @param model
 * @param materials
 */
HX.ModelInstance.prototype.init = function(model, materials)
{
    if (this._model || this._materials)
        throw new Error("ModelInstance already initialized");

    this._model = model;

    if (materials)
        this._materials = materials instanceof Array? materials : [ materials ];

    if (model) {
        if (model.skeleton) {
            this._skeletonPose = [];
            for (var i = 0; i < model.skeleton.numJoints; ++i) {
                this._skeletonPose[i] = new HX.Matrix4x4();
            }
        }
        model.onChange.bind(this._onModelChange, this);
        this._onModelChange();
    }

    this._invalidateWorldBounds();
};

HX.ModelInstance.prototype.getMeshInstance = function(index)
{
    return this._meshInstances[index];
};


HX.ModelInstance.prototype._addMeshInstance = function(mesh, material)
{
    this._meshInstances.push(new HX.MeshInstance(mesh, material));
};

HX.ModelInstance.prototype._onModelChange = function()
{
    var maxIndex = this._materials.length - 1;
    for (var i = 0; i < this._model.numMeshes; ++i) {
        this._addMeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]);
    }

    this._invalidateWorldBounds();
};

// override for better matches
HX.ModelInstance.prototype._updateWorldBounds = function()
{
    this._meshBounds.transformFrom(this._model.localBounds, this.worldMatrix);
    this._worldBounds.growToIncludeBound(this._meshBounds);
    HX.Entity.prototype._updateWorldBounds.call(this);
};

HX.ModelInstance.prototype.acceptVisitor = function(visitor)
{
    visitor.visitModelInstance(this, this.worldMatrix, this.worldBounds);
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
};

HX.ModelInstance.prototype.toString = function()
{
    return "[ModelInstance(name=" + this._name + ")]";
};
HX.RectMesh = {};

HX.RectMesh.create = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 2);
    data.addVertexAttribute('hx_texCoord', 2);
    data.setVertexData([-1, 1, 0, 1,
                        1, 1, 1, 1,
                        1, -1, 1, 0,
                        -1, -1, 0, 0], 0);
    data.setIndexData([0, 1, 2, 0, 2, 3]);
    return new HX.Mesh(data);
};

HX.RectMesh._initDefault = function()
{
    HX.RectMesh.DEFAULT = HX.RectMesh.create();
};
HX.ScanlineMesh = {};

HX.ScanlineMesh.create = function(screenHeight)
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 2);

    var pixelHeight = 2.0 / screenHeight;
    var vertices = [];
    var indices = [];
    var indexBase = 0;

    // only draw on odd rows
    for (var y = 0; y < screenHeight; y += 2) {
        var base = y / screenHeight * 2.0 - 1.0;
        var top = base + pixelHeight;

        vertices.push(
            -1, top,
             1, top,
             1, base,
            -1, base
        );

        indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 2, indexBase + 3);

        indexBase += 4;
    }

    data.setVertexData(vertices, 0);
    data.setIndexData(indices);

    return new HX.Mesh(data);
};
/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    // AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
    HX.Entity.call(this);
    this._scaledIrradiance = new HX.Color();
    this._intensity = 1.0;
    this.color = new HX.Color(.1,.1,.1);
    this._scaledIrradiance = new HX.Color();
    this._updateScaledIrradiance();
};

HX.AmbientLight.prototype = Object.create(HX.Entity.prototype);

Object.defineProperties(HX.AmbientLight.prototype, {
    color: {
        get: function() { return this._color; },
        set: function(value)
        {
            this._color = isNaN(value) ? value : new HX.Color(value);
            this._updateScaledIrradiance();
        }
    },

    intensity: {
        get: function() { return this._intensity; },
        set: function(value)
        {
            this._intensity = value;
            this._updateScaledIrradiance();
        },
    }
});

HX.AmbientLight.prototype.acceptVisitor = function (visitor)
{
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitAmbientLight(this);
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

HX.AmbientLight.prototype._updateScaledIrradiance = function()
{
    // do not scale by 1/PI. It feels weird to control.
    if (HX.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= this._intensity;
    this._scaledIrradiance.g *= this._intensity;
    this._scaledIrradiance.b *= this._intensity;
};
/**
 *
 * @constructor
 */
HX.DirectionalLight = function()
{
    HX.Light.call(this);

    this._numCascades = 1;
    this._shadowMapSize = 1024;

    // these two don't need getters/setters (saves on filesize)
    this.depthBias = .0;

    this.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);
    this._matrixData = null;

    this._dirLocation = null;
    this._colorLocation = null;
    this._splitDistancesLocation = null;
    this._shadowMatrixLocation = null;
    this._depthBiasLocation = null;
};

// set on init
HX.DirectionalLight.SHADOW_FILTER = null;

HX.DirectionalLight.prototype = Object.create(HX.Light.prototype,
    {
        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows === value) return;

                this._castShadows = value;

                if (value) {
                    HX.DirectionalLight.SHADOW_FILTER.onShaderInvalid.bind(this._onShadowFilterChange, this);
                    this._shadowMapRenderer = new HX.CascadeShadowMapRenderer(this, this._numCascades, this._shadowMapSize);
                }
                else {
                    HX.DirectionalLight.SHADOW_FILTER.onShaderInvalid.unbind(this._onShadowFilterChange);
                    this._shadowMapRenderer.dispose();
                    this._shadowMapRenderer = null;
                }

                this._invalidateLightPass();
            }
        },

        numCascades: {
            get: function()
            {
                return this._numCascades;
            },

            set: function(value)
            {
                if (value > 4) {
                    console.warn("set numCascades called with value greater than 4. Real value will be set to 4.");
                    value = 4;
                }

                this._numCascades = value;
                if (this._castShadows) this._invalidateLightPass();
                if (this._shadowMapRenderer) this._shadowMapRenderer.setNumCascades(value);
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.setShadowMapSize(value);
            }
        },

        direction: {
            get: function()
            {
                var dir = this.worldMatrix.getColumn(2);
                dir.x = -dir.x;
                dir.y = -dir.y;
                dir.z = -dir.z;
                return dir;
            },

            set: function(value)
            {
                var matrix = new HX.Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = HX.Float4.add(value, position);
                matrix.lookAt(target, position, HX.Float4.Y_AXIS);
                this.matrix = matrix;
            }
        }
    });

/**
 * The ratios that define every cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane. Passing more than numCascades has no effect.
 * @param r1
 * @param r2
 * @param r3
 * @param r4
 */
HX.DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._shadowMapRenderer.setSplitRatios(r1, r2, r3, r4);
};

HX.DirectionalLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    if (!this._lightPass)
        this._initLightPass();

    var camera = renderer._camera;

    this._lightPass.updateRenderState(renderer);

    var light = lightCollection[startIndex];
    var dir = camera.viewMatrix.transform(light.direction);
    var color = light._scaledIrradiance;

    HX_GL.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);
    HX_GL.uniform3f(this._colorLocation, color.r ,color.g, color.b);

    if (this._castShadows) {
        var splitDistances = this._shadowMapRenderer.splitDistances;
        HX_GL.uniform1fv(this._splitDistancesLocation, new Float32Array(splitDistances));
        HX_GL.uniform1f(this._depthBiasLocation, light.depthBias);

        var k = 0;
        var len = this._numCascades;
        var matrix = new HX.Matrix4x4();

        for (var i = 0; i < len; ++i) {
            matrix.multiply(this._shadowMapRenderer.getShadowMatrix(i), camera.worldMatrix);
            var m = matrix._m;
            for (var j = 0; j < 16; ++j) {
                this._matrixData[k++] = m[j];
            }
        }

        HX_GL.uniformMatrix4fv(this._shadowMatrixLocation, false, this._matrixData);
    }

    // render rect mesh
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);

    return startIndex + 1;
};

HX.DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

HX.DirectionalLight.prototype._initLightPass =  function()
{
    var defines = {};

    if (this._castShadows) {
        defines.CAST_SHADOWS = 1;
        defines.NUM_CASCADES = this._numCascades;
    }

    var vertexShader = HX.ShaderLibrary.get("directional_light_vertex.glsl", defines);
    var fragmentShader =
        HX.DirectionalLight.SHADOW_FILTER.getGLSL() + "\n" +
        HX.LIGHTING_MODEL.getGLSL() + "\n" +
        HX.ShaderLibrary.get("directional_light_fragment.glsl", defines);

    var pass = new HX.EffectPass(vertexShader, fragmentShader);
    pass.blendState = HX.BlendState.ADD;

    this._dirLocation = pass.getUniformLocation("lightViewDirection");
    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;

    if (this._castShadows) {
        this._matrixData = new Float32Array(16 * this._numCascades);
        this._lightPass.setTexture("shadowMap", this._shadowMapRenderer._shadowMap);
        this._splitDistancesLocation = this._lightPass.getUniformLocation("splitDistances[0]");
        this._shadowMatrixLocation = this._lightPass.getUniformLocation("shadowMapMatrices[0]");
        this._depthBiasLocation = this._lightPass.getUniformLocation("depthBias");
    }
};

HX.DirectionalLight.prototype._invalidateLightPass = function()
{
    if (this._lightPass) {
        this._lightPass._shader.dispose();
        this._lightPass = null;
        this._dirLocation = null;
        this._colorLocation = null;
        this._splitDistancesLocation = null;
        this._shadowMatrixLocation = null;
        this._depthBiasLocation = null;
        this._matrixData = null;
    }
};

HX.DirectionalLight.prototype._onShadowFilterChange = function()
{
    this._invalidateLightPass();
};
// highly experimental
HX.ExponentialDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
};


HX.ExponentialDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        darkeningFactor: {
            get: function()
            {
                return this._darkeningFactor;
            },

            set: function(value)
            {
                this._darkeningFactor = value;
                this.onShaderInvalid.dispatch();
            }
        },

        // not recommended to change
        expScaleFactor: {
            get: function()
            {
                return this._expScaleFactor;
            },

            set: function(value)
            {
                this._expScaleFactor = value;
                this.onShaderInvalid.dispatch();
            }
        }
    });

HX.ExponentialDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return HX_GL.RGB;
};

HX.ExponentialDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return HX_GL.FLOAT;
};

HX.ExponentialDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return HX.ShaderLibrary.get("dir_shadow_esm.glsl", defines);
};

HX.ExponentialDirectionalShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

HX.ExponentialDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new HX.ESMBlurShader(this._blurRadius);
};

HX.ESMBlurShader = function(blurRadius)
{
    HX.Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = HX.ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("esm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = HX_GL.getUniformLocation(this._program, "source");
    this._directionLocation = HX_GL.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(this._textureLocation, 0);
};

HX.ESMBlurShader.prototype = Object.create(HX.Shader.prototype);

HX.ESMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX_GL.uniform2f(this._directionLocation, dirX, dirY);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};
/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalSpecularProbe = function(texture)
{
    this._texture = texture;

    this._pass = this._initPass();
};

// conversion range for spec power to mip
HX.GlobalSpecularProbe.powerRange0 = .00098;
HX.GlobalSpecularProbe.powerRange1 = .9921;

HX.GlobalSpecularProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalSpecularProbe.prototype.render = function(renderer)
{
    this._pass.updateRenderState(renderer);

    if (this._texture) {
        var maxMip = Math.floor(HX.log2(this._texture.size));
        var mipOffset = 0;
        HX_GL.uniform1f(this._numMipsLocation, maxMip - mipOffset);
    }

    // render rect mesh
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.GlobalSpecularProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalSpecularProbe.prototype._initPass = function()
{
    var defines = {};
    var extensions = [];

    if (HX.EXT_SHADER_TEXTURE_LOD) {
        defines.USE_TEX_LOD = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    defines.K0 = HX.GlobalSpecularProbe.powerRange0;
    defines.K1 = HX.GlobalSpecularProbe.powerRange1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_specular_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_specular_probe_fragment.glsl", defines, extensions)
    );

    pass.blendState = HX.BlendState.ADD;

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("specularProbeSampler", this._texture);

    var minRoughness = 0.0014;
    var maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;
    var maxMipFactor = (Math.pow(2.0, -10.0/Math.sqrt(maxPower)) - HX.GlobalSpecularProbe.powerRange0)/HX.GlobalSpecularProbe.powerRange1;
    pass.setUniform("maxMipFactor", maxMipFactor);

    return pass;
};


/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalIrradianceProbe = function(texture)
{
    this._texture = texture;
    this._pass = this._initPass();
};

HX.GlobalIrradianceProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalIrradianceProbe.prototype.render = function(renderer)
{
    this._pass.updateRenderState(renderer);

    // render rect mesh
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.GlobalIrradianceProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalIrradianceProbe.prototype._initPass = function()
{
    var defines = {};

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_irradiance_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_irradiance_probe_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};
HX.HardDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
};

HX.HardDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype);

HX.HardDirectionalShadowFilter.prototype.getGLSL = function()
{
    return HX.ShaderLibrary.get("dir_shadow_hard.glsl");
};

HX.HardDirectionalShadowFilter.prototype.getCullMode = function()
{
    return HX.CullMode.FRONT;
};
HX.PCFDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._softness = .01;
    this._numShadowSamples = 6;
    this._dither = false;
};

HX.PCFDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        }
    }
);

HX.PCFDirectionalShadowFilter.prototype.getCullMode = function()
{
    return HX.CullMode.FRONT;
};

HX.PCFDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        HX_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_PCF_DITHER_SHADOWS = 1;

    return HX.ShaderLibrary.get("dir_shadow_pcf.glsl", defines);
};
/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this);

    // TODO: use geodesic sphere
    if (!HX.PointLight._initialized) {
        var sphere = HX.SpherePrimitive.createMeshData(
            {
                radius: 1.0,
                invert: true,
                numSegmentsW: HX.PointLight.SPHERE_SEGMENTS_W,
                numSegmentsH: HX.PointLight.SPHERE_SEGMENTS_H,
                uvs: false,
                normals: false,
                tangents: false
            });

        HX.PointLight._sphereMesh = new HX.Mesh(HX.MeshBatch.create(sphere, HX.PointLight.LIGHTS_PER_BATCH));
        HX.PointLight.NUM_SPHERE_INDICES = sphere._indexData.length;
        HX.PointLight._positionData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._colorData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._radiusData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH);

        this._initLightPasses();

        HX.PointLight._initialized = true;
    }


    this._radius = 100.0;
    this.intensity = 3.1415;
};

HX.PointLight.LIGHTS_PER_BATCH = 20;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = -1;  // will be set on creation instead of passing value that might get invalidated

HX.PointLight.prototype = Object.create(HX.Light.prototype,
    {
        // radius is not physically correct, but invaluable for performance
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
            }
        }
    });

// returns the index of the FIRST UNRENDERED light
HX.PointLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    HX.PointLight._lightPass.updateRenderState(renderer);

    var camera = renderer._camera;
    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var radiusData = HX.PointLight._radiusData;
    var pos = new HX.Float4();
    var viewMatrix = camera.viewMatrix;

    var v1i = 0, v3i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        if (light._type != this._type/* || light._renderOrderHint > 0*/) {
            end = i;
            break;
        }

        light.worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);

        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        // todo: lights behind camera become too big to render
        radiusData[v1i++] = light._radius * 1.0001; // add some padding to account for imperfect geometry
    }

    var vertexBuffers = HX.PointLight._sphereMesh._vertexBuffers;
    vertexBuffers[0].bind();
    HX_GL.vertexAttribPointer(HX.PointLight._positionAttrib, 3, HX_GL.FLOAT, false, 12, 0);
    vertexBuffers[1].bind();
    HX_GL.vertexAttribPointer(HX.PointLight._instanceAttrib, 1, HX_GL.FLOAT, false, 4, 0);
    HX_GL.uniform3fv(HX.PointLight._positionLocation, posData);
    HX_GL.uniform3fv(HX.PointLight._colorLocation, colorData);
    HX_GL.uniform1fv(HX.PointLight._lightRadiusLocation, radiusData);

    // TODO: Should only draw when depth sphere > depth scene
    // but should also use stencil buffer to mark when front sphere depth > depth scene, because then it doesn't light anything
    // however, stencil buffer is already used for lighting models etc :s
    // could we still reserve a bit somewhere?
    // can't use depth test on PowerVR

    HX.drawElements(HX_GL.TRIANGLES, HX.PointLight.NUM_SPHERE_INDICES * (end - startIndex), 0);

    return end;
};

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
};

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

HX.PointLight.prototype._initLightPasses =  function()
{
    var defines = {
        LIGHTS_PER_BATCH: HX.PointLight.LIGHTS_PER_BATCH
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_vertex.glsl", defines),
        HX.LIGHTING_MODEL.getGLSL() + HX.ShaderLibrary.get("point_light_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;
    pass.depthTest = HX.Comparison.DISABLED;
    pass.cullMode = HX.CullMode.BACK;
    pass.writeDepth = false;

    // do not use rect
    pass.setMesh(HX.PointLight._sphereMesh);

    HX.PointLight._positionAttrib = pass.getAttributeLocation("hx_position");
    HX.PointLight._instanceAttrib = pass.getAttributeLocation("hx_instanceID");
    HX.PointLight._lightPass = pass;
    HX.PointLight._positionLocation = pass.getUniformLocation("lightViewPosition[0]");
    HX.PointLight._colorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._lightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};
HX.VarianceDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._blurRadius = 2;
    this._lightBleedReduction = .35;
};

HX.VarianceDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        lightBleedReduction: {
            get: function()
            {
                return this._lightBleedReduction;
            },

            set: function(value)
            {
                this._lightBleedReduction = value;
                this.onShaderInvalid.dispatch();
            }
        }
    });

HX.VarianceDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return HX.ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
};

HX.VarianceDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new HX.VSMBlurShader(this._blurRadius);
};

HX.VarianceDirectionalShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this._lightBleedReduction;
    return {
        HX_VSM_MIN_VARIANCE: .0001,
        HX_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_VSM_LIGHT_BLEED_REDUCTION_RANGE: "float(" + range + ")"
    };
};

/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.VSMBlurShader = function(blurRadius)
{
    HX.Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = HX.ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("vsm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = HX_GL.getUniformLocation(this._program, "source");
    this._directionLocation = HX_GL.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(this._textureLocation, 0);
};

HX.VSMBlurShader.prototype = Object.create(HX.Shader.prototype);

HX.VSMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX_GL.uniform2f(this._directionLocation, dirX, dirY);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};
HX.Primitive =
{
    _ATTRIBS: function()
    {
        this.positions = [];
        this.uvs = null;
        this.normals = null;
        this.indices = [];
    },

    define: function()
    {
        var type = function(definition) {
            definition = definition || {};

            var data = type.createMeshData(definition);

            var modelData = new HX.ModelData();
            modelData.addMeshData(data);
            HX.Model.call(this, modelData);
        };

        type.prototype = Object.create(HX.Model.prototype);

        type.createMeshData = function(definition)
        {
            var attribs = new HX.Primitive._ATTRIBS();
            var uvs = definition.uvs === undefined? true : definition.uvs;
            var normals = definition.normals === undefined? true : definition.normals;
            var tangents = definition.tangents === undefined? true : definition.tangents;

            var data = new HX.MeshData();
            data.addVertexAttribute('hx_position', 3);

            if (normals) {
                data.addVertexAttribute('hx_normal', 3);
                attribs.normals = [];
            }

            if (tangents)
                data.addVertexAttribute('hx_tangent', 4);

            if (uvs) {
                data.addVertexAttribute('hx_texCoord', 2);
                attribs.uvs = [];
            }

            type._generate(attribs, definition);

            var scaleU = definition.scaleU || 1;
            var scaleV = definition.scaleV || 1;

            var len = attribs.positions.length / 3;
            var v = 0, v2 = 0, v3 = 0;
            var vertices = [];

            for (var i = 0; i < len; ++i) {
                vertices[v++] = attribs.positions[v3];
                vertices[v++] = attribs.positions[v3 + 1];
                vertices[v++] = attribs.positions[v3 + 2];

                if (normals) {
                    vertices[v++] = attribs.normals[v3];
                    vertices[v++] = attribs.normals[v3 + 1];
                    vertices[v++] = attribs.normals[v3 + 2];
                }

                if (tangents)
                    v += 4;

                if (uvs) {
                    vertices[v++] = attribs.uvs[v2++] * scaleU;
                    vertices[v++] = attribs.uvs[v2++] * scaleV;
                }

                v3 += 3;
            }

            data.setVertexData(vertices, 0);
            data.setIndexData(attribs.indices);

            var mode = 0;

            // if data isn't provided, generate it manually
            if (normals && attribs.normals.length === 0)
                mode |= HX.NormalTangentGenerator.MODE_NORMALS;

            if (tangents)
                mode |= HX.NormalTangentGenerator.MODE_TANGENTS;

            if (mode) {
                var generator = new HX.NormalTangentGenerator();
                generator.generate(data, mode);
            }

            return data;
        };

        type.createMesh = function definition(definition) {
            var data = type.createMeshData(definition);
            return new HX.Mesh(data);
        };

        return type;
    }
};
/**
 * @constructor
 */
HX.BoxPrimitive = HX.Primitive.define();

HX.BoxPrimitive._generate = function(target, definition)
{
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || definition.numSegmentsW || 1;
    var numSegmentsD = definition.numSegmentsD || definition.numSegmentsW || 1;
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var rcpNumSegmentsD = 1/numSegmentsD;
    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;


    // front and back
    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;
        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            if (flipSign < 0) ratioU = 1.0 - ratioU;

            // front and back
            positions.push(x*flipSign, y*flipSign, halfD*flipSign);
            positions.push(-x*flipSign, y*flipSign, -halfD*flipSign);

            if (normals) {
                normals.push(0, 0, 1);
                normals.push(0, 0, -1);
            }

            if (uvs) {
                uvs.push(ratioU, ratioV);
                uvs.push(ratioU, ratioV);
            }
        }
    }

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;

        for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
            var ratioU = dSegment * rcpNumSegmentsD;
            var z = depth * ratioU - halfD;

            // left and right
            positions.push(-halfW, y, z*flipSign);
            positions.push(halfW, y, -z*flipSign);

            if (normals) {
                normals.push(-flipSign, 0, 0);
                normals.push(flipSign, 0, 0);
            }

            if (uvs) {
                uvs.push(ratioU, ratioV);
                uvs.push(ratioU, ratioV);
            }
        }
    }

    for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
        var ratioV = dSegment * rcpNumSegmentsD;
        var z = depth * ratioV - halfD;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            // top and bottom
            positions.push(x, halfH, -z*flipSign);
            positions.push(x, -halfH, z*flipSign);

            if (normals) {
                normals.push(0, flipSign, 0);
                normals.push(0, -flipSign, 0);
            }

            if (uvs) {
                uvs.push(1.0 - ratioU, 1.0 - ratioV);
                uvs.push(1.0 - ratioU, 1.0 - ratioV);
            }
        }
    }

    var offset = 0;

    for (var face = 0; face < 3; ++face) {
        // order:
        // front, back, left, right, bottom, top
        var numSegmentsU = face === 1? numSegmentsD : numSegmentsW;
        var numSegmentsV = face === 2? numSegmentsD : numSegmentsH;

        for (var yi = 0; yi < numSegmentsV; ++yi) {
            for (var xi = 0; xi < numSegmentsU; ++xi) {
                var w = numSegmentsU + 1;
                var base = offset + xi + yi*w;
                var i0 = base << 1;
                var i1 = (base + w + 1) << 1;
                var i2 = (base + w) << 1;
                var i3 = (base + 1) << 1;

                indices.push(i0, i1, i2);
                indices.push(i0, i3, i1);

                indices.push(i0 | 1, i1 | 1, i2 | 1);
                indices.push(i0 | 1, i3 | 1, i1 | 1);
            }
        }
        offset += (numSegmentsU + 1) * (numSegmentsV + 1);
    }

    var indexIndex = 0;
    if (doubleSided) {
        var i = 0;

        while (i < indexIndex) {
            indices.push(indices[i], indices[i + 2], indices[i + 1]);
            indices.push(indices[i + 3], indices[i + 5], indices[i + 4]);
            indexIndex += 6;
        }
    }
};
HX.ConePrimitive = HX.Primitive.define();

/**
 * The alignment dictates which access should be parallel to the sides of the cylinder
 * @type {number}
 */
HX.ConePrimitive.ALIGN_X = 1;
HX.ConePrimitive.ALIGN_Y = 2;
HX.ConePrimitive.ALIGN_Z = 3;

HX.ConePrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsW = definition.numSegmentsW || 1;
    var radius = definition.radius || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    // sides
    for (var hi = 0; hi <= numSegmentsH; ++hi) {
        var rad = (1.0 - hi * rcpNumSegmentsH) * radius;
        var h = (hi*rcpNumSegmentsH - .5)*height;
        for (var ci = 0; ci <= numSegmentsW; ++ci) {
            var angle = ci * rcpNumSegmentsW * Math.PI * 2;
            var nx = Math.sin(angle);
            var ny = Math.cos(angle);
            var cx = nx * rad;
            var cy = ny * rad;

            positions.push(cx, h, -cy);
            if (normals) normals.push(nx, 0, -ny);

            if (uvs) uvs.push(1.0 - ci*rcpNumSegmentsW, hi*rcpNumSegmentsH);
        }
    }

    for (var ci = 0; ci < numSegmentsW; ++ci) {
        for (var hi = 0; hi < numSegmentsH - 1; ++hi) {
            var w = numSegmentsW + 1;
            var base = ci + hi*w;

            indices.push(base, base + w, base + w + 1);
            indices.push(base, base + w + 1, base + 1);

            if (doubleSided) {
                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }

        // tip only needs 1 tri
        var w = numSegmentsW + 1;
        var base = ci + (numSegmentsH - 1)*w;
        indices.push(base, base + w + 1, base + 1);
    }

    // top & bottom
    var indexOffset = positions.length / 3;
    var halfH = height * .5;
    for (var ci = 0; ci < numSegmentsW; ++ci) {
        var angle = ci * rcpNumSegmentsW * Math.PI * 2;
        var u = Math.sin(angle);
        var v = Math.cos(angle);
        var cx = u * radius;
        var cy = v * radius;

        u = -u * .5 + .5;
        v = v * .5 + .5;

        positions.push(cx, -halfH, -cy);
        if (normals) normals.push(0, -1, 0);
        if (uvs) uvs.push(u, v);
    }

    for (var ci = 1; ci < numSegmentsW - 1; ++ci)
        indices.push(indexOffset, indexOffset + ci, indexOffset + ci + 1);
};
HX.CylinderPrimitive = HX.Primitive.define();

/**
 * The alignment dictates which access should be parallel to the sides of the cylinder
 * @type {number}
 */
HX.CylinderPrimitive.ALIGN_X = 1;
HX.CylinderPrimitive.ALIGN_Y = 2;
HX.CylinderPrimitive.ALIGN_Z = 3;

HX.CylinderPrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || HX.CylinderPrimitive.ALIGN_Y;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsW = definition.numSegmentsW || 1;
    var radius = definition.radius || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    // sides
    for (var hi = 0; hi <= numSegmentsH; ++hi) {
        var h = (hi*rcpNumSegmentsH - .5)*height;
        for (var ci = 0; ci <= numSegmentsW; ++ci) {
            var angle = ci * rcpNumSegmentsW * Math.PI * 2;
            var nx = Math.sin(angle);
            var ny = Math.cos(angle);
            var cx = nx * radius;
            var cy = ny * radius;

            switch (alignment) {
                case HX.CylinderPrimitive.ALIGN_X:
                    positions.push(-h, cx, -cy);
                    if (normals) normals.push(0, nx, -ny);
                    break;
                case HX.CylinderPrimitive.ALIGN_Y:
                    positions.push(cx, h, -cy);
                    if (normals) normals.push(nx, 0, -ny);
                    break;
                case HX.CylinderPrimitive.ALIGN_Z:
                    positions.push(cx, cy, h);
                    if (normals) normals.push(nx, ny, 0);
                    break;
            }

            if (uvs) uvs.push(1.0 - ci*rcpNumSegmentsW, hi*rcpNumSegmentsH);
        }
    }

    for (var hi = 0; hi < numSegmentsH; ++hi) {
        for (var ci = 0; ci < numSegmentsW; ++ci) {
            var w = numSegmentsW + 1;
            var base = ci + hi*w;

            indices.push(base, base + w, base + w + 1);
            indices.push(base, base + w + 1, base + 1);

            if (doubleSided) {
                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }
    }


    // top & bottom
    var indexOffset = positions.length / 3;
    var halfH = height * .5;
    for (var ci = 0; ci < numSegmentsW; ++ci) {
        var angle = ci * rcpNumSegmentsW * Math.PI * 2;
        var u = Math.sin(angle);
        var v = Math.cos(angle);
        var cx = u * radius;
        var cy = v * radius;

        u = -u * .5 + .5;
        v = v * .5 + .5;

        switch (alignment) {
            case HX.CylinderPrimitive.ALIGN_X:
                positions.push(halfH, cx, -cy);
                positions.push(-halfH, cx, -cy);

                if (normals) {
                    normals.push(1, 0, 0);
                    normals.push(-1, 0, 0);
                }

                if (uvs) {
                    uvs.push(v, 1.0 - u);
                    uvs.push(1.0 - v,  1.0 - u);
                }
                break;

            case HX.CylinderPrimitive.ALIGN_Y:
                positions.push(cx, -halfH, -cy);
                positions.push(cx, halfH, -cy);

                if (normals) {
                    normals.push(0, -1, 0);
                    normals.push(0, 1, 0);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(u, 1.0 - v);
                }
                break;

            case HX.CylinderPrimitive.ALIGN_Z:
                positions.push(cx, cy, -halfH);
                positions.push(cx, cy, halfH);

                if (normals) {
                    normals.push(0, 0, -1);
                    normals.push(0, 0, 1);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(1.0 - u, v);
                }
                break;
        }
    }

    for (var ci = 1; ci < numSegmentsW - 1; ++ci) {
        var offset = ci << 1;
        indices.push(indexOffset, indexOffset + offset, indexOffset + offset + 2);
        indices.push(indexOffset + 1, indexOffset + offset + 3, indexOffset + offset + 1);
    }
};
/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.PlanePrimitive = HX.Primitive.define();

HX.PlanePrimitive.ALIGN_XZ = 1;
HX.PlanePrimitive.ALIGN_XY = 2;
HX.PlanePrimitive.ALIGN_YZ = 3;

HX.PlanePrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || HX.PlanePrimitive.ALIGN_XZ;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;
    var normalX = 0, normalY = 0, normalZ = 0;
    var uvU = 0, uvV = 0;

    if (alignment == HX.PlanePrimitive.ALIGN_XY)
        normalZ = -1;
    else if (alignment == HX.PlanePrimitive.ALIGN_XZ)
        normalY = 1;
    else
        normalX = 1;

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment == HX.PlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else if (alignment == HX.PlanePrimitive.ALIGN_XZ) {
                posX = x;
                posZ = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else {
                posY = y;
                posZ = x;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }

            positions.push(posX, posY, posZ);

            if (normals)
                normals.push(normalX, normalY, normalZ);

            if (uvs)
                uvs.push(uvU, uvV);

            // add vertex with same position, but with inverted normal & tangent
            if (doubleSided) {
                positions.push(posX, posY, posZ);

                if (normals)
                    normals.push(-normalX, -normalY, -normalZ);

                if (uvs)
                    uvs.push(1.0 - uvU, uvV);
            }

            if (xi != numSegmentsW && yi != numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;
                var mult = doubleSided ? 1 : 0;

                indices.push(base << mult, (base + w) << mult, (base + w + 1) << mult);
                indices.push(base << mult, (base + w + 1) << mult, (base + 1) << mult);

                if(doubleSided) {
                    indices.push(((base + w + 1) << mult) + 1, ((base + w) << mult) + 1, (base << mult) + 1);
                    indices.push(((base + 1) << mult) + 1, ((base + w + 1) << mult) + 1, (base << mult) + 1);
                }
            }
        }
    }
};
HX.SpherePrimitive = HX.Primitive.define();

HX.SpherePrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;

    var flipSign = definition.invert? -1 : 1;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var polarSegment = 0; polarSegment <= numSegmentsH; ++polarSegment) {
        var ratioV = polarSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI;

        var y = -Math.cos(theta);
        var segmentUnitRadius = Math.sin(theta);

        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var azimuthSegment = 0; azimuthSegment <= numSegmentsW; ++azimuthSegment) {
            var ratioU = azimuthSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;

            if (flipSign) ratioU = 1.0 - ratioU;

            var normalX = Math.cos(phi) * segmentUnitRadius * flipSign;
            var normalY = y * flipSign;
            var normalZ = Math.sin(phi) * segmentUnitRadius * flipSign;

            // position
            positions.push(normalX*radius, normalY*radius, normalZ*radius);

            if (normals)
                normals.push(normalX * flipSign, normalY * flipSign, normalZ * flipSign);

            if (uvs)
                uvs.push(ratioU, ratioV);
        }
    }

    var indices = target.indices;

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices.push(base, base + w, base + w + 1);
            indices.push(base, base + w + 1, base + 1);

            if (doubleSided) {
                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }
    }
};
HX.TorusPrimitive = HX.Primitive.define();

HX.TorusPrimitive.ALIGN_XZ = 1;
HX.TorusPrimitive.ALIGN_XY = 2;
HX.TorusPrimitive.ALIGN_YZ = 3;

HX.TorusPrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 15;
    var numSegmentsH = definition.numSegmentsH || 20;
    var radius = definition.radius || .5;
    var tubeRadius = definition.tubeRadius || .1;
    var alignment = definition.alignment || HX.PlanePrimitive.ALIGN_XZ;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var poloidalSegment = 0; poloidalSegment <= numSegmentsH; ++poloidalSegment) {
        var ratioV = poloidalSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI * 2.0;
        var px = Math.cos(theta);
        var py = Math.sin(theta);

        for (var toroidalSegment = 0; toroidalSegment <= numSegmentsW; ++toroidalSegment) {
            var ratioU = toroidalSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;
            var tx = Math.cos(phi);
            var tz = Math.sin(phi);
            var rad = radius + px  * tubeRadius;

            switch(alignment) {
                case HX.TorusPrimitive.ALIGN_XZ:
                    positions.push(tx * rad, py  * tubeRadius, tz * rad);

                    if (normals)
                        normals.push(tx * px, py, tz * px);

                    break;
                case HX.TorusPrimitive.ALIGN_XY:
                    positions.push(-tx * rad, tz * rad, py  * tubeRadius);

                    if (normals)
                        normals.push(-tx * px, tz * px, py);
                    break;
                case HX.TorusPrimitive.ALIGN_YZ:
                    positions.push(py  * tubeRadius, -tx * rad, tz * rad);

                    if (normals)
                        normals.push(py, -tx * px, tz * px);

                    break;
            }

            if (uvs)
                uvs.push(ratioU, 1.0 - ratioV);
        }
    }

    var indices = target.indices;

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices.push(base, base + w, base + w + 1);
            indices.push(base, base + w + 1, base + 1);

            if (doubleSided) {
                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }
    }
};
/**
 * @constructor
 */
HX.FrameBuffer = function(colorTextures, depthBuffer, cubeFace)
{
    if (colorTextures && colorTextures[0] === undefined) colorTextures = [ colorTextures ];

    this._cubeFace = cubeFace;
    this._colorTextures = colorTextures;
    this._numColorTextures = this._colorTextures? this._colorTextures.length : 0;
    this._depthBuffer = depthBuffer;

    if (this._colorTextures && this._numColorTextures > 1) {

        this._drawBuffers = new Array(this._numColorTextures);
        for (var i = 0; i < this._numColorTextures; ++i) {
            this._drawBuffers[i] = HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i;
        }
    }
    else {
        this._drawBuffers = null;
    }

    this._fbo = HX_GL.createFramebuffer();
};

HX.FrameBuffer.prototype = {
    constructor: HX.FrameBuffer,

    get width() { return this._width; },
    get height() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.UNSIGNED_BYTE ]
     */
    init: function()
    {
        HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, this._fbo);

        if (this._colorTextures) {
            if (this._cubeFace === undefined) {
                this._width = this._colorTextures[0]._width;
                this._height = this._colorTextures[0]._height;
            }
            else {
                this._height = this._width = this._colorTextures[0].size;
            }
        }
        else  {
            this._width = this._depthBuffer._width;
            this._height = this._depthBuffer._height;
        }

        for (var i = 0; i < this._numColorTextures; ++i) {
            var texture = this._colorTextures[i];
            var target = this._cubeFace === undefined? HX_GL.TEXTURE_2D : this._cubeFace;

            if (HX.EXT_DRAW_BUFFERS)
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, target, texture._texture, 0);
            else
            // try using default (will only work for 1 color texture tho)
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, HX_GL.COLOR_ATTACHMENT0 + i, target, texture._texture, 0);
        }


        if (this._depthBuffer) {
            var attachment = this._depthBuffer.format === HX_GL.DEPTH_STENCIL? HX_GL.DEPTH_STENCIL_ATTACHMENT : HX_GL.DEPTH_ATTACHMENT;

            if (this._depthBuffer instanceof HX.Texture2D) {
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, attachment, HX_GL.TEXTURE_2D, this._depthBuffer._texture, 0);
            }
            else {
                HX_GL.bindRenderbuffer(HX_GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
                HX_GL.framebufferRenderbuffer(HX_GL.FRAMEBUFFER, attachment, HX_GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
            }
        }

        var status = HX_GL.checkFramebufferStatus(HX_GL.FRAMEBUFFER);

        switch (status) {
            case HX_GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case HX_GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case HX_GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case HX_GL.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
        }
    },

    dispose: function()
    {
        HX_GL.deleteFramebuffer(this._fbo);
    }
};
/**
 *
 * @constructor
 */
HX.Texture2D = function()
{
    this._name = null;
    this._default = HX.Texture2D.DEFAULT;
    this._texture = HX_GL.createTexture();
    this._width = 0;
    this._height = 0;
    this._format = null;
    this._dataType = null;

    this.bind();

    // set defaults
    this.maxAnisotropy = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;
    this.filter = HX.TextureFilter.DEFAULT;
    this.wrapMode = HX.TextureWrapMode.DEFAULT;

    this._isReady = false;

    HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
};

HX.Texture2D._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    HX.Texture2D.DEFAULT = new HX.Texture2D();
    HX.Texture2D.DEFAULT.uploadData(data, 1, 1, true);
    HX.Texture2D.DEFAULT.filter = HX.TextureFilter.NEAREST_NOMIP;
};

HX.Texture2D.prototype =
{
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    dispose: function()
    {
        HX_GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX_GL.generateMipmap(HX_GL.TEXTURE_2D);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_MIN_FILTER, filter.min);
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_MAG_FILTER, filter.mag);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);

        if (filter === HX.TextureFilter.NEAREST_NOMIP || filter === HX.TextureFilter.NEAREST) {
            this.maxAnisotropy = 1;
        }
    },

    get wrapMode()
    {
        return this._wrapMode;
    },

    set wrapMode(mode)
    {
        this._wrapMode = mode;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_WRAP_S, mode.s);
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_WRAP_T, mode.t);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        if (value > HX.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },
    get dataType() { return this._dataType; },

    initEmpty: function(width, height, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_2D);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 1);

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_2D);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined) {
            HX_GL.activeTexture(HX_GL.TEXTURE0 + unitIndex);
        }

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, this._texture);
    },

    toString: function()
    {
        return "[Texture2D(name=" + this._name + ")]";
    }
};


/**
 *
 * @constructor
 */
HX.TextureCube = function()
{
    this._name = null;
    this._default = HX.TextureCube.DEFAULT;
    this._texture = HX_GL.createTexture();
    this._size = 0;
    this._format = null;
    this._dataType = null;

    this.bind();
    this.filter = HX.TextureFilter.DEFAULT;
    this.maxAnisotropy = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

    this._isReady = false;
};

HX.TextureCube._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    HX.TextureCube.DEFAULT = new HX.TextureCube();
    HX.TextureCube.DEFAULT.uploadData([data, data, data, data, data, data], 1, true);
    HX.TextureCube.DEFAULT.filter = HX.TextureFilter.NEAREST_NOMIP;
    HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
};

HX.TextureCube.prototype =
{
    constructor: HX.TextureCube,

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    dispose: function()
    {
        HX_GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX_GL.TEXTURE_MIN_FILTER, filter.min);
        HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX_GL.TEXTURE_MAG_FILTER, filter.mag);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        if (value > HX.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get size() { return this._size; },
    get format() { return this._format; },
    get dataType() { return this._dataType; },

    initEmpty: function(size, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, null);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, data[0]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, data[1]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, data[2]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, data[3]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, data[4]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this._format = format;
        this._dataType = dataType;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        if (generateMips) {
            this.bind();
            HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        if (mipLevel == 0)
            this._size = images[0].naturalWidth;

        this.bind();

        HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, format, format, dataType, images[0]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, format, format, dataType, images[1]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, format, format, dataType, images[2]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, format, format, dataType, images[3]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, format, format, dataType, images[4]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, format, format, dataType, images[5]);

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX_GL.activeTexture(HX_GL.TEXTURE0 + unitIndex);

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, this._texture);
    },

    toString: function()
    {
        return "[TextureCube(name=" + this._name + ")]";
    }
};
HX.TextureUtils =
{
    /**
     * Resizes a texture (empty) if its size doesn't match. Returns true if the size has changed.
     * @param width The target width
     * @param height The target height
     * @param texture The texture to be resized if necessary
     * @param fbo (optional) Any fbos to be reinitialized if necessary
     * @returns {boolean} Returns true if the texture has been resized, false otherwise.
     */
    assureSize: function(width, height, texture, fbo, format, dataType)
    {
        if (width === texture.width && height === texture.height)
            return false;

        texture.initEmpty(width, height, format, dataType);
        if (fbo) fbo.init();
        return true;
    },

    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    equirectangularToCube: function(source, size, generateMipmaps, target)
    {
        generateMipmaps = generateMipmaps || true;
        size = size || source.height;

        if (!HX.TextureUtils._EQUI_TO_CUBE_SHADER)
            HX.TextureUtils._EQUI_TO_CUBE_SHADER = new HX.Shader(HX.ShaderLibrary.get("2d_to_cube_vertex.glsl"), HX.ShaderLibrary.get("equirectangular_to_cube_fragment.glsl"));

        this._createRenderCubeGeometry();

        target = target || new HX.TextureCube();
        target.initEmpty(size, source.format, source.dataType);
        var faces = [ HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z ];

        HX.TextureUtils._EQUI_TO_CUBE_SHADER.updateRenderState();

        var textureLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getUniformLocation("source");
        var posLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getAttributeLocation("hx_position");
        var cornerLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getAttributeLocation("corner");

        HX_GL.uniform1i(textureLocation, 0);
        source.bind(0);

        HX.TextureUtils._TO_CUBE_VERTICES.bind();
        HX.TextureUtils._TO_CUBE_INDICES.bind();
        HX_GL.vertexAttribPointer(posLocation, 2, HX_GL.FLOAT, false, 20, 0);
        HX_GL.vertexAttribPointer(cornerLocation, 3, HX_GL.FLOAT, false, 20, 8);

        HX.enableAttributes(2);

        for (var i = 0; i < 6; ++i) {
            var fbo = new HX.FrameBuffer(target, null, faces[i]);
            fbo.init();

            HX.pushRenderTarget(fbo);

            HX.drawElements(HX_GL.TRIANGLES, 6, i * 6);
            HX.popRenderTarget(fbo);

            fbo.dispose();
        }

        if (generateMipmaps)
            target.generateMipmap();

        return target;
    },

    _createRenderCubeGeometry: function()
    {
        if (HX.TextureUtils._TO_CUBE_VERTICES) return;
        var vertices = [
            // pos X
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,

            // neg X
            1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, 1.0,

            // pos Y
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, 1.0, 1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0, 1.0, 1.0,

            // neg Y
            -1.0, -1.0, -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0, -1.0, 1.0,
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,

            // pos Z
            1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, 1.0,

            // neg Z
            1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, -1.0
        ];
        var indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        HX.TextureUtils._TO_CUBE_VERTICES = new HX.VertexBuffer();
        HX.TextureUtils._TO_CUBE_INDICES = new HX.IndexBuffer();
        HX.TextureUtils._TO_CUBE_VERTICES.uploadData(new Float32Array(vertices));
        HX.TextureUtils._TO_CUBE_INDICES.uploadData(new Uint16Array(indices));
    }
};
/**
 * @constructor
 */
HX.WriteOnlyDepthBuffer = function()
{
    this._renderBuffer = HX_GL.createRenderbuffer();
    this._format = null;
};

HX.WriteOnlyDepthBuffer.prototype = {
    constructor: HX.FrameBuffer,

    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.UNSIGNED_BYTE ]
     */
    init: function(width, height, stencil)
    {
        stencil = stencil === undefined? true : stencil;
        this._width = width;
        this._height = height;
        this._format = stencil? HX_GL.DEPTH_STENCIL : HX_GL.DEPTH_COMPONENT16;

        HX_GL.bindRenderbuffer(HX_GL.RENDERBUFFER, this._renderBuffer);
        HX_GL.renderbufferStorage(HX_GL.RENDERBUFFER, this._format, width, height);
    },

    dispose: function()
    {
        HX_GL.deleteRenderBuffer(this._renderBuffer);
    }
};
HX.BlendState = function(srcFactor, dstFactor, operator, color)
{
    this.enabled = true;
    this.srcFactor = srcFactor || HX.BlendFactor.ONE;
    this.dstFactor = dstFactor || HX.BlendFactor.ZERO;
    this.operator = operator || HX.BlendOperation.ADD;
    this.color = color || null;
};

HX.BlendState._initDefaults = function()
{
    HX.BlendState.ADD = new HX.BlendState(HX.BlendFactor.ONE, HX.BlendFactor.ONE);
    HX.BlendState.ADD_WITH_ALPHA = new HX.BlendState(HX.BlendFactor.SOURCE_ALPHA, HX.BlendFactor.ONE);
    HX.BlendState.MULTIPLY = new HX.BlendState(HX.BlendFactor.DESTINATION_COLOR, HX.BlendFactor.ZERO);
    HX.BlendState.ALPHA = new HX.BlendState(HX.BlendFactor.SOURCE_ALPHA, HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA);
    HX.BlendState.INV_ALPHA = new HX.BlendState(HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA, HX.BlendFactor.SOURCE_ALPHA);
};
/**
 *
 * @constructor
 */
HX.CascadeShadowCasterCollector = function(numCascades)
{
    HX.SceneVisitor.call(this);
    this._renderCameras = null;
    this._bounds = new HX.BoundingAABB();
    this._numCascades = numCascades;
    this._cullPlanes = null;
    this._splitPlanes = null;
    this._numCullPlanes = 0;
    this._renderLists = [];
    this._renderItemPool = new HX.RenderItemPool();
};

HX.CascadeShadowCasterCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderLists[index]; };

HX.CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._collectorCamera = camera;
    this._bounds.clear();
    this._renderItemPool.reset();

    for (var i = 0; i < this._numCascades; ++i) {
        this._renderLists[i] = [];
    }

    scene.acceptVisitor(this);
};

HX.CascadeShadowCasterCollector.prototype.getBounds = function()
{
    return this._bounds;
};

HX.CascadeShadowCasterCollector.prototype.setRenderCameras = function(cameras)
{
    this._renderCameras = cameras;
};

HX.CascadeShadowCasterCollector.prototype.setCullPlanes = function(cullPlanes, numPlanes)
{
    this._cullPlanes = cullPlanes;
    this._numCullPlanes = numPlanes;
};

HX.CascadeShadowCasterCollector.prototype.setSplitPlanes = function(splitPlanes)
{
    this._splitPlanes = splitPlanes;
};

HX.CascadeShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (modelInstance._castShadows === false) return;

    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = HX.MaterialPass.SHADOW_DEPTH_PASS;

    var numCascades = this._numCascades;
    var numMeshes = modelInstance.numMeshInstances;

    //if (!worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes)) return;

    var lastCascade = numCascades - 1;
    for (var cascade = 0; cascade <= lastCascade; ++cascade) {

        var renderList = this._renderLists[cascade];
        var renderCamera = this._renderCameras[cascade];

        var planeSide;

        // always contained in lastCascade if we made it this far
        if (cascade === lastCascade)
            planeSide = HX.PlaneSide.BACK;
        else
            planeSide = worldBounds.classifyAgainstPlane(this._splitPlanes[cascade]);

        if (planeSide !== HX.PlaneSide.FRONT) {
            for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
                var meshInstance = modelInstance.getMeshInstance(meshIndex);
                var material = meshInstance.material;

                if (material.hasPass(passIndex)) {
                    var renderItem = this._renderItemPool.getItem();
                    renderItem.pass = material.getPass(passIndex);
                    renderItem.meshInstance = meshInstance;
                    renderItem.worldMatrix = worldMatrix;
                    renderItem.camera = renderCamera;
                    renderItem.material = material;

                    renderList.push(renderItem);
                }
            }

            // completely contained in the cascade, so it won't be in more distant slices
            if (planeSide === HX.PlaneSide.BACK)
                return;
        }
    }

    // no need to test the last split plane, if we got this far, it's bound to be in it

};

HX.CascadeShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

/**
 *
 * @constructor
 */
HX.CascadeShadowMapRenderer = function(light, numCascades, shadowMapSize)
{
    this._light = light;
    this._numCascades = numCascades || 3;
    if (this._numCascades > 4) this._numCascades = 4;
    this._shadowMapSize = shadowMapSize || 1024;
    this._shadowMapInvalid = true;
    this._fboFront = null;
    this._fboBack = null;
    this._depthBuffer = null;   // only used if depth textures aren't supported

    this._shadowMap = this._createShadowBuffer();
    this._shadowBackBuffer = HX.DirectionalLight.SHADOW_FILTER.blurShader? this._createShadowBuffer() : null;

    this._shadowMatrices = [ new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4() ];
    this._transformToUV = [ new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4() ];
    this._inverseLightMatrix = new HX.Matrix4x4();
    this._splitRatios = null;
    this._splitDistances = null;
    this._shadowMapCameras = null;
    this._collectorCamera = new HX.OrthographicOffCenterCamera();
    this._minZ = 0;
    this._numCullPlanes = 0;
    this._cullPlanes = [];
    this._localBounds = new HX.BoundingAABB();
    this._casterCollector = new HX.CascadeShadowCasterCollector(this._numCascades);

    this._initSplitProperties();
    this._initCameras();

    this._viewports = [];
};

HX.CascadeShadowMapRenderer.prototype =
{
    setNumCascades: function(value)
    {
        if (this._numCascades === value) return;
        this._numCascades = value;
        this._invalidateShadowMap();
        this._initSplitProperties();
        this._initCameras();
        this._casterCollector = new HX.CascadeShadowCasterCollector(value);
    },

    setShadowMapSize: function(value)
    {
        if (this._setShadowMapSize === value) return;
        this._setShadowMapSize = value;
        this._invalidateShadowMap();
    },

    render: function(viewCamera, scene)
    {
        if (this._shadowMapInvalid)
            this._initShadowMap();

        this._inverseLightMatrix.inverseAffineOf(this._light.worldMatrix);
        this._updateCollectorCamera(viewCamera);
        this._updateSplits(viewCamera);
        this._updateCullPlanes(viewCamera);
        this._collectShadowCasters(scene);
        this._updateCascadeCameras(viewCamera, this._casterCollector.getBounds());

        HX.pushRenderTarget(this._fboFront);
        {
            var passType = HX.MaterialPass.SHADOW_DEPTH_PASS;
            HX.setClearColor(HX.Color.WHITE);
            HX.clear();

            for (var cascadeIndex = 0; cascadeIndex < this._numCascades; ++cascadeIndex) {
                var viewport = this._viewports[cascadeIndex];
                HX_GL.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                HX.RenderUtils.renderPass(this, passType, this._casterCollector.getRenderList(cascadeIndex));
            }

            if (HX.DirectionalLight.SHADOW_FILTER.blurShader) {
                this._blur();
            }

            HX.popRenderTarget();
        }

        HX.setClearColor(HX.Color.BLACK);
    },

    _updateCollectorCamera: function(viewCamera)
    {
        var corners = viewCamera.frustum._corners;
        var min = new HX.Float4();
        var max = new HX.Float4();
        var tmp = new HX.Float4();

        this._inverseLightMatrix.transformPoint(corners[0], min);
        max.copyFrom(min);

        for (var i = 1; i < 8; ++i) {
            this._inverseLightMatrix.transformPoint(corners[i], tmp);
            min.minimize(tmp);
            max.maximize(tmp);
        }

        this._minZ = min.z;

        this._collectorCamera.matrix.copyFrom(this._light.worldMatrix);
        this._collectorCamera._invalidateWorldMatrix();
        this._collectorCamera.setBounds(min.x, max.x + 1, max.y + 1, min.y);
        this._collectorCamera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);
    },

    _updateSplits: function(viewCamera)
    {
        var nearDist = viewCamera.nearDistance;
        var frustumRange = viewCamera.farDistance - nearDist;
        var plane = new HX.Float4(0.0, 0.0, -1.0, 0.0);
        var matrix = viewCamera.worldMatrix;

        for (var i = 0; i < this._numCascades; ++i) {
            this._splitDistances[i] = plane.w = -(nearDist + this._splitRatios[i] * frustumRange);
            matrix.transform(plane, this._splitPlanes[i]);
        }
    },

    _updateCascadeCameras: function(viewCamera, bounds)
    {
        this._localBounds.transformFrom(bounds, this._inverseLightMatrix);

        var minBound = this._localBounds.minimum;
        var maxBound = this._localBounds.maximum;

        var scaleSnap = 1.0;	// always scale snap to a meter

        var localNear = new HX.Float4();
        var localFar = new HX.Float4();
        var min = new HX.Float4();
        var max = new HX.Float4();

        var corners = viewCamera.frustum.corners;

        // camera distances are suboptimal? need to constrain to local near too?

        var nearRatio = 0;
        for (var cascade = 0; cascade < this._numCascades; ++cascade) {
            var farRatio = this._splitRatios[cascade];
            var camera = this._shadowMapCameras[cascade];

            camera.matrix = this._light.worldMatrix;

            // figure out frustum bound
            for (var i = 0; i < 4; ++i) {
                var nearCorner = corners[i];
                var farCorner = corners[i + 4];

                var nx = nearCorner.x;
                var ny = nearCorner.y;
                var nz = nearCorner.z;
                var dx = farCorner.x - nx;
                var dy = farCorner.y - ny;
                var dz = farCorner.z - nz;
                localNear.x = nx + dx*nearRatio;
                localNear.y = ny + dy*nearRatio;
                localNear.z = nz + dz*nearRatio;
                localFar.x = nx + dx*farRatio;
                localFar.y = ny + dy*farRatio;
                localFar.z = nz + dz*farRatio;

                this._inverseLightMatrix.transformPoint(localNear, localNear);
                this._inverseLightMatrix.transformPoint(localFar, localFar);

                if (i === 0) {
                    min.copyFrom(localNear);
                    max.copyFrom(localNear);
                }
                else {
                    min.minimize(localNear);
                    max.maximize(localNear);
                }

                min.minimize(localFar);
                max.maximize(localFar);
            }

            nearRatio = farRatio;

            // do not render beyond range of view camera or scene depth
            min.z = Math.max(this._minZ, min.z);

            var left = Math.max(min.x, minBound.x);
            var right = Math.min(max.x, maxBound.x);
            var bottom = Math.max(min.y, minBound.y);
            var top = Math.min(max.y, maxBound.y);

            var width = right - left;
            var height = top - bottom;

            width = Math.ceil(width / scaleSnap) * scaleSnap;
            height = Math.ceil(height / scaleSnap) * scaleSnap;
            width = Math.max(width, scaleSnap);
            height = Math.max(height, scaleSnap);

            // snap to pixels
            var offsetSnapX = this._shadowMap._width / width * .5;
            var offsetSnapY = this._shadowMap._height / height * .5;

            left = Math.floor(left * offsetSnapX) / offsetSnapX;
            bottom = Math.floor(bottom * offsetSnapY) / offsetSnapY;
            right = left + width;
            top = bottom + height;

            var softness = HX.DirectionalLight.SHADOW_FILTER.softness ? HX.DirectionalLight.SHADOW_FILTER.softness : .1;

            camera.setBounds(left - softness, right + softness, top + softness, bottom - softness);

            // cannot clip nearDistance to frustum, because casters in front may cast into this frustum
            camera.nearDistance = -maxBound.z;
            camera.farDistance = -min.z;

            camera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);

            this._shadowMatrices[cascade].multiply(this._transformToUV[cascade], camera.viewProjectionMatrix);
        }
    },

    _updateCullPlanes: function(viewCamera)
    {
        var frustum = this._collectorCamera.frustum;
        var planes = frustum._planes;

        for (var i = 0; i < 4; ++i)
            this._cullPlanes[i] = planes[i];

        this._numCullPlanes = 4;

        frustum = viewCamera.frustum;
        planes = frustum._planes;

        var dir = this._light.direction;

        for (var j = 0; j < 6; ++j) {
            var plane = planes[j];

            // view frustum planes facing away from the light direction mark a boundary beyond which no shadows need to be known
            if (HX.dot3(plane, dir) > 0.001)
                this._cullPlanes[this._numCullPlanes++] = plane;
        }
    },

    _collectShadowCasters: function(scene)
    {
        this._casterCollector.setSplitPlanes(this._splitPlanes);
        this._casterCollector.setCullPlanes(this._cullPlanes, this._numCullPlanes);
        this._casterCollector.setRenderCameras(this._shadowMapCameras);
        this._casterCollector.collect(this._collectorCamera, scene);
    },

    get splitDistances()
    {
        return this._splitDistances;
    },

    /**
     * The ratios that define every cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane.
     * @param r1
     * @param r2
     * @param r3
     * @param r4
     */
    setSplitRatios: function(r1, r2, r3, r4)
    {
        this._splitRatios[0] = r1;
        this._splitRatios[1] = r2;
        this._splitRatios[2] = r3;
        this._splitRatios[3] = r4;
    },

    getShadowMatrix: function(cascade)
    {
        return this._shadowMatrices[cascade];
    },

    dispose: function()
    {
        HX.Renderer.call.dispose(this);
        if (this._depthBuffer) {
            this._depthBuffer.dispose();
            this._depthBuffer = null;
        }
        this._shadowMap.dispose();
        this._shadowMap = null;
    },

    _invalidateShadowMap: function()
    {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function()
    {
        var numMapsW = this._numCascades > 1? 2 : 1;
        var numMapsH = Math.ceil(this._numCascades / 2);

        var texWidth = this._shadowMapSize * numMapsW;
        var texHeight = this._shadowMapSize * numMapsH;

        this._shadowMap.initEmpty(texWidth, texHeight, HX.DirectionalLight.SHADOW_FILTER.getShadowMapFormat(), HX.DirectionalLight.SHADOW_FILTER.getShadowMapDataType());
        if (!this._depthBuffer) this._depthBuffer = new HX.WriteOnlyDepthBuffer();
        if (!this._fboFront) this._fboFront = new HX.FrameBuffer(this._shadowMap, this._depthBuffer);

        this._depthBuffer.init(texWidth, texHeight, false);
        this._fboFront.init();
        this._shadowMapInvalid = false;

        if (this._shadowBackBuffer) {
            this._shadowBackBuffer.initEmpty(texWidth, texHeight, HX.DirectionalLight.SHADOW_FILTER.getShadowMapFormat(), HX.DirectionalLight.SHADOW_FILTER.getShadowMapDataType());
            if (!this._fboBack) this._fboBack = new HX.FrameBuffer(this._shadowBackBuffer, this._depthBuffer);
            this._fboBack.init();
        }

        this._viewports = [];
        this._viewports.push(new HX.Rect(0, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new HX.Rect(this._shadowMapSize, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new HX.Rect(0, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new HX.Rect(this._shadowMapSize, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));

        this._initViewportMatrices(1.0 / numMapsW, 1.0 / numMapsH);
    },

    _initSplitProperties: function()
    {
        var ratio = 1.0;
        this._splitRatios = [];
        this._splitDistances = [0, 0, 0, 0];
        this._splitPlanes = [];
        for (var i = this._numCascades - 1; i >= 0; --i)
        {
            this._splitRatios[i] = ratio;
            this._splitPlanes[i] = new HX.Float4();
            this._splitDistances[i] = 0;
            ratio *= .33;
        }
    },

    _initCameras: function()
    {
        this._shadowMapCameras = [];
        for (var i = this._numCascades - 1; i >= 0; --i)
        {
            this._shadowMapCameras[i] = new HX.OrthographicOffCenterCamera();
        }
    },

    _initViewportMatrices: function(scaleW, scaleH)
    {
        var halfVec = new HX.Float4(.5,.5,.5);
        for (var i = 0; i < 4; ++i) {
            // transform [-1, 1] to [0 - 1] (also for Z)
            this._transformToUV[i].fromScale(.5);
            this._transformToUV[i].appendTranslation(halfVec);

            // transform to tiled size
            this._transformToUV[i].appendScale(scaleW, scaleH, 1.0);
        }

        this._transformToUV[1].appendTranslation(new HX.Float4(0.5, 0.0, 0.0));
        this._transformToUV[2].appendTranslation(new HX.Float4(0.0, 0.5, 0.0));
        this._transformToUV[3].appendTranslation(new HX.Float4(0.5, 0.5, 0.0));
    },

    _createShadowBuffer: function()
    {
        var tex = new HX.Texture2D();
        //tex.filter = HX.TextureFilter.NEAREST_NOMIP;
        // while filtering doesn't actually work on encoded values, it looks much better this way since at least it can filter
        // the MSB, which is useful for ESM etc
        tex.filter = HX.TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = HX.TextureWrapMode.CLAMP;
        return tex;
    },

    _blur: function()
    {
        var shader = HX.DirectionalLight.SHADOW_FILTER.blurShader;

        for (var i = 0; i < HX.DirectionalLight.SHADOW_FILTER.numBlurPasses; ++i) {
            HX.pushRenderTarget(this._fboBack);
            {
                HX.clear();
                shader.execute(HX.RectMesh.DEFAULT, this._shadowMap, 1.0 / this._shadowMapSize, 0.0);
                HX.popRenderTarget();
            }

            HX.clear();
            shader.execute(HX.RectMesh.DEFAULT, this._shadowBackBuffer, 0.0, 1.0 / this._shadowMapSize);
        }
    }
};
/**
 * Simple normalized blinn-phong model (NDF * fresnel)
 */
HX.BlinnPhongSimpleLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong.glsl") + "\n\n";
    }
};

/**
 * Normalized blinn-phong with visibility and foreshortening terms.
 */
/*HX.BlinnPhongFullLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong.glsl",
                {
                    VISIBILITY: 1
                }) + "\n\n";
    }
};*/

/**
 * Full GGX model with geometric and foreshortening terms.
 */
/*HX.GGXFullLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_ggx.glsl",
                {
                    VISIBILITY: 1
                }) + "\n\n";
    }
};*/

/**
 * GGX distribution model without visibility term.
 */
HX.GGXLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_ggx.glsl") + "\n\n";
    }
};
HX.View = function(scene, camera, xRatio, yRatio, widthRatio, heightRatio)
{
    this.scene = scene;
    this.camera = camera;
    this.viewport = new HX.Rect();
    this._renderer = null;
    this._texture = null;
    this._fbo = null;
    this.xRatio = xRatio || 0;
    this.yRatio = yRatio || 0;
    this.widthRatio = widthRatio || 1;
    this.heightRatio = heightRatio || 1;
    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
};

/**
 * MultiRenderer is a renderer for multiple viewports
 * @constructor
 */
HX.MultiRenderer = function()
{
    this._views = [];
    this._copyTexture = new HX.CopyChannelsShader();
};

HX.MultiRenderer.prototype =
{
    addView: function (view)
    {
        view._renderer = new HX.Renderer();
        view._texture = new HX.Texture2D();
        view._texture.filter = HX.TextureFilter.BILINEAR_NOMIP;
        view._texture.wrapMode = HX.TextureWrapMode.CLAMP;
        view._fbo = new HX.FrameBuffer(view._texture);
        view._renderer.debugMode = this._debugMode;
        this._views.push(view);
    },

    removeView: function (view)
    {
        view._fbo.dispose();
        view._texture.dispose();
        view._renderer.dispose();
        var index = this._views.indexOf(view);
        this._views.splice(index, 1);
    },

    render: function (dt, renderTarget)
    {
        HX.pushRenderTarget(renderTarget);

        var viewport = new HX.Rect();
        var screenWidth = HX.TARGET_CANVAS.clientWidth;
        var screenHeight = HX.TARGET_CANVAS.clientHeight;
        for (var i = 0; i < this._views.length; ++i) {
            var view = this._views[i];
            var w = Math.floor(screenWidth * view.widthRatio);
            var h = Math.floor(screenHeight * view.heightRatio);

            if (view._texture.width != w || view._texture.height != h) {
                view._texture.initEmpty(w, h);
                view._fbo.init();
            }

            view._renderer.render(view.camera, view.scene, dt, view._fbo);
            viewport.x = Math.floor(view.xRatio * screenWidth);
            viewport.y = Math.floor((1.0 - view.yRatio - view.heightRatio) * screenHeight);
            viewport.width = w;
            viewport.height = h;
            HX.setViewport(viewport);
            this._copyTexture.execute(HX.RectMesh.DEFAULT, view._texture);
        }

        HX.setViewport(null);

        HX.popRenderTarget();
    },

    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
        for (var i = 0; i < this._views.length; ++i)
            this._views[i]._renderer.debugMode = value;
    }
};
/**
 *
 * @constructor
 */
HX.RenderCollector = function()
{
    HX.SceneVisitor.call(this);

    this._renderItemPool = new HX.RenderItemPool();

    // linked lists of RenderItem
    this._opaquePasses = new Array( HX.MaterialPass.NUM_PASS_TYPES ); // add in individual pass types
    this._transparentPasses = new Array( HX.MaterialPass.NUM_PASS_TYPES ); // add in individual pass types
    this._camera = null;
    this._cameraZAxis = new HX.Float4();
    this._frustum = null;
    this._lights = null;
    this._ambientColor = new HX.Color();
    this._shadowCasters = null;
    this._effects = null;
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

HX.RenderCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.RenderCollector.prototype.getOpaqueRenderList = function(passType) { return this._opaquePasses[passType]; };
// only contains GBUFFER passes:
HX.RenderCollector.prototype.getTransparentRenderList = function(passType) { return this._transparentPasses[passType]; };
HX.RenderCollector.prototype.getLights = function() { return this._lights; };
HX.RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
HX.RenderCollector.prototype.getEffects = function() { return this._effects; };
HX.RenderCollector.prototype.getGlobalSpecularProbe = function() { return this._globalSpecularProbe; };
HX.RenderCollector.prototype.getGlobalIrradianceProbe = function() { return this._globalIrradianceProbe; };

Object.defineProperties(HX.RenderCollector.prototype, {
    ambientColor: {
        get: function() { return this._ambientColor; }
    }
});

HX.RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._frustum = camera.frustum;
    this._reset();

    scene.acceptVisitor(this);

    this._opaquePasses[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortOpaques);
    this._transparentPasses[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortOpaques); // transparents can be treated as opaques in our renderer

    if (!HX.EXT_DRAW_BUFFERS) {
        this._copyLegacyPasses(this._opaquePasses);
        this._copyLegacyPasses(this._transparentPasses);
    }

    this._lights.sort(this._sortLights);

    var effects = this._camera._effects;
    // add camera effects at the end
    if (effects) {
        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            this._effects.push(effects[i]);
        }
    }
};

HX.RenderCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._frustum._planes, 6);
};

HX.RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox) {
        this.visitModelInstance(skybox._modelInstance, scene._rootNode.worldMatrix, scene._rootNode.worldBounds);
        this._globalSpecularProbe = skybox.getGlobalSpecularProbe();
        this._globalIrradianceProbe = skybox.getGlobalIrradianceProbe();
    }
};

HX.RenderCollector.prototype.visitEffects = function(effects)
{
    // camera does not pass effects
    //if (ownerNode === this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

HX.RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var opaque = HX.TransparencyMode.OPAQUE;
    var camera = this._camera;

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        var material = meshInstance.material;
        var list = material._transparencyMode === opaque? this._opaquePasses : this._transparentPasses;

        for (var passIndex = 0; passIndex < HX.MaterialPass.NUM_PASS_TYPES; ++passIndex) {
            var pass = material.getPass(passIndex);
            if (pass && pass._enabled) {
                var renderItem = renderPool.getItem();

                renderItem.material = material;
                renderItem.pass = pass;
                renderItem.meshInstance = meshInstance;
                renderItem.skeleton = skeleton;
                renderItem.skeletonMatrices = skeletonMatrices;
                // distance along Z axis:
                var center = worldBounds._center;
                renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;
                renderItem.worldMatrix = worldMatrix;
                renderItem.camera = camera;

                list[passIndex].push(renderItem);
            }
        }
    }
};

HX.RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light._scaledIrradiance;
    this._ambientColor.r += color.r;
    this._ambientColor.g += color.g;
    this._ambientColor.b += color.b;
};

HX.RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castShadows) this._shadowCasters.push(light._shadowMapRenderer);
};

HX.RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this._opaquePasses[i] = [];

    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this._transparentPasses[i] = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._globalIrradianceProbe = null;
    this._globalSpecularProbe = null;
    this._ambientColor.set(0, 0, 0, 1);
};

HX.RenderCollector.prototype._sortTransparents = function(a, b)
{
    var diff = a.material._renderOrder - b.material._renderOrder;
    if (diff !== 0) return diff;
    return b.renderOrderHint - a.renderOrderHint;
};

HX.RenderCollector.prototype._sortOpaques = function(a, b)
{
    var diff;

    diff = a.material._renderOrder - b.material._renderOrder;
    if (diff !== 0) return diff;

    diff = a.material._renderOrderHint - b.material._renderOrderHint;
    if (diff !== 0) return diff;

    return a.renderOrderHint - b.renderOrderHint;
};

HX.RenderCollector.prototype._sortLights = function(a, b)
{
    return  a._type === b._type?
            a._castShadows? 1 : -1 :
            a._type - b._type;
};

HX.RenderCollector.prototype._copyLegacyPasses = function(list)
{
    var colorPasses = list[HX.MaterialPass.GEOMETRY_COLOR_PASS];
    var normalPasses = list[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
    var specularPasses = list[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];
    var len = colorPasses.length;
    var n = 0;
    var s = 0;
    var camera = this._camera;
    var renderItemPool = this._renderItemPool;

    for (var i = 0; i < len; ++i) {
        var renderItem = colorPasses[i];
        var meshInstance = renderItem.meshInstance;
        var worldMatrix = renderItem.worldMatrix;
        var material = renderItem.material;
        var renderOrderHint = renderItem.renderOrderHint;

        // for unlit lighting models, these passes may be unavailable
        if (material.hasPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS)) {
            var normalItem = renderItemPool.getItem();
            normalItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS);
            normalItem.material = material;
            normalItem.renderOrderHint = renderOrderHint;
            normalItem.meshInstance = meshInstance;
            normalItem.worldMatrix = worldMatrix;
            normalItem.camera = camera;
            normalPasses[n++] = normalItem;
        }

        if (material.hasPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS)) {
            var specItem = renderItemPool.getItem();
            specItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS);
            specItem.material = material;
            specItem.renderOrderHint = renderOrderHint;
            specItem.meshInstance = meshInstance;
            specItem.worldMatrix = worldMatrix;
            specItem.camera = camera;
            specularPasses[s++] = specItem;
        }
    }

};
/**
 * The debug render mode to inspect properties in the GBuffer, the lighting accumulation buffer, AO, etc.
 */
HX.DebugRenderMode = {
    DEBUG_NONE: 0,
    DEBUG_COLOR: 1,
    DEBUG_NORMALS: 2,
    DEBUG_METALLICNESS: 3,
    DEBUG_SPECULAR_NORMAL_REFLECTION: 4,
    DEBUG_ROUGHNESS: 5,
    DEBUG_DEPTH: 6,
    DEBUG_LIGHT_ACCUM: 7,
    DEBUG_TRANSPARENCY_MODE: 8,
    DEBUG_AO: 9,
    DEBUG_SSR: 10
};


/**
 * Renderer is the main renderer for drawing a Scene to the screen.
 *
 * GBUFFER LAYOUT:
 * 0: COLOR: (color.XYZ, transparency when using transparencyMode, otherwise reserved)
 * 1: NORMALS: (normals.XYZ, unused, or normals.xy, depth.zw if depth texture not supported)
 * 2: REFLECTION: (roughness, normalSpecularReflection, metallicness, emission ratio)   // emission ratio defines how much of the albedo is emitted
 * 3: LINEAR DEPTH: (not explicitly written to by user), 0 - 1 linear depth encoded as RGBA
 *
 * @constructor
 */
HX.Renderer = function ()
{
    this._width = 0;
    this._height = 0;

    // devices with high resolution (retina etc)
    this._scale = 1.0; // > 1.0? .5 : 1.0;

    // TODO: How many of these can be single instances?
    this._copyAmbient = new HX.MultiplyColorCopyShader();
    this._reproject = new HX.ReprojectShader();
    this._copyTexture = new HX.CopyChannelsShader();
    this._copyTextureToScreen = new HX.CopyChannelsShader("xyzw", true);
    this._copyXChannel = new HX.CopyChannelsShader("x");
    this._copyYChannel = new HX.CopyChannelsShader("y");
    this._copyZChannel = new HX.CopyChannelsShader("z");
    this._copyWChannel = new HX.CopyChannelsShader("w");
    this._debugDepth = new HX.DebugDepthShader();
    this._debugTransparencyMode = new HX.DebugTransparencyModeShader();
    this._debugNormals = new HX.DebugNormalsShader();
    this._applyGamma = new HX.ApplyGammaShader();
    this._applyBlendingShader = new HX.ApplyBlendingShader();
    this._markScanlinesStencilState = new HX.StencilState(0xff, HX.Comparison.ALWAYS, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE);
    this._applyScanlinesStencilState = new HX.StencilState(0xff, HX.Comparison.EQUAL, HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);
    this._markScanlinesShader = new HX.NullShader();
    this._gammaApplied = false;
    this._scanLineMesh = null;

    if (HX.EXT_DEPTH_TEXTURE) {
        this._linearizeDepthShader = new HX.LinearizeDepthShader();
        this._linearDepthFBO = null;
    }

    this._renderCollector = new HX.RenderCollector();
    this._gbufferFBO = null;

    this._depthBuffer = null;
    this._aoEffect = null;
    this._aoTexture = null;
    this._ssrEffect = null;

    this._createGBuffer();

    this._hdrBack = new HX.Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new HX.Renderer.HDRBuffers(this._depthBuffer);

    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
    this._camera = null;

    this._previousViewProjection = new HX.Matrix4x4();
};

HX.Renderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new HX.Texture2D();
    this.texture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = HX.TextureWrapMode.CLAMP;
    this.fbo = new HX.FrameBuffer(this.texture);
    this.fboDepth = new HX.FrameBuffer(this.texture, depthBuffer);
};

HX.Renderer.HDRBuffers.prototype =
{
    dispose: function()
    {
        this.texture.dispose();
        this.fbo.dispose();
        this.fboDepth.dispose();
    },

    resize: function(width, height)
    {
        this.texture.initEmpty(width, height, HX_GL.RGBA, HX.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

HX.Renderer.prototype =
{
    get scale()
    {
        return this._scale;
    },

    set scale(value)
    {
        this._scale = value;
    },

    get camera()
    {
        return this._camera;
    },

    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
    },

    get ambientOcclusion()
    {
        return this._aoEffect;
    },

    set ambientOcclusion(value)
    {
        this._aoEffect = value;
    },

    get localReflections()
    {
        return this._ssrEffect;
    },

    set localReflections(value)
    {
        this._ssrEffect = value;
        this._ssrTexture = this._ssrEffect? this._ssrEffect.getSSRTexture() : null;
    },

    /**
     * It's not recommended changing render targets if they have different sizes (so splitscreen should be fine). Otherwise, use different renderer instances.
     * @param camera
     * @param scene
     * @param dt
     * @param renderTarget (optional)
     */
    render: function (camera, scene, dt, renderTarget)
    {
        var renderTargetStackSize = HX._renderTargetStack.length;
        this._gammaApplied = HX.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;

        this._aoTexture = this._aoEffect ? this._aoEffect.getAOTexture() : null;

        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._renderShadowCasters();

        this._renderToGBuffer();

        if (HX.EXT_DEPTH_TEXTURE)
            this._linearizeDepth();

        if (this._aoEffect !== null)
            this._aoEffect.render(this, 0);

        this._renderLightAccumulation();
        this._applyBlending();

        if (this._ssrEffect)
            this._ssrEffect.render(this, dt);

        this._renderToScreen(renderTarget, dt);

        this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        HX.setBlendState();
        HX.setDepthMask(true);

        if (HX._renderTargetStack.length > renderTargetStackSize) throw new Error("Unpopped render targets!");
        if (HX._renderTargetStack.length < renderTargetStackSize) throw new Error("Overpopped render targets!");
    },

    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector._shadowCasters;
        var len = casters.length;

        for (var i = 0; i < len; ++i)
            casters[i].render(this._camera, this._scene)
    },

    _renderToGBuffer: function ()
    {
        HX.setClearColor(HX.Color.ZERO);    // also set alpha 0

        if (HX.EXT_DRAW_BUFFERS)
            this._renderToGBufferMRT();
        else
            this._renderToGBufferMultiPass();
    },

    _renderScanlines: function()
    {
        HX.setDepthMask(false);
        HX_GL.colorMask(false, false, false, false);
        HX.pushStencilState(this._markScanlinesStencilState);
        this._markScanlinesShader.execute(this._scanLineMesh);
        HX.popStencilState();
        HX_GL.colorMask(true, true, true, true);
        HX.setDepthMask(true);
    },

    _renderToGBufferMRT: function ()
    {
        HX.pushRenderTarget(this._gbufferFBO);
        HX.clear();

        this._renderPass(HX.MaterialPass.GEOMETRY_PASS);

        var transparents = this._renderCollector.getTransparentRenderList(HX.MaterialPass.GEOMETRY_PASS);

        if (transparents.length > 0) {
            this._renderScanlines();

            HX.pushStencilState(this._applyScanlinesStencilState);
            this._renderPass(HX.MaterialPass.GEOMETRY_PASS, transparents);
            HX.popStencilState();
        }

        HX.popRenderTarget();
    },

    _renderToGBufferMultiPass: function ()
    {
        var len = this._gbufferSingleFBOs.length;
        for (var i = 0; i < len; ++i) {
            HX.pushRenderTarget(this._gbufferSingleFBOs[i]);
            HX.clear();
            this._renderPass(i);

            var transparents = this._renderCollector.getTransparentRenderList(i);

            if (transparents.length > 0) {
                this._renderScanlines();

                HX.pushStencilState(this._applyScanlinesStencilState);
                this._renderPass(i, transparents);
                HX.popStencilState();
            }

            HX.popRenderTarget();
        }
    },

    _linearizeDepth: function ()
    {
        HX.pushRenderTarget(this._linearDepthFBO);
        HX.clear();
        this._linearizeDepthShader.execute(HX.RectMesh.DEFAULT, this._depthBuffer, this._camera);
        HX.popRenderTarget();
    },

    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    _renderToScreen: function (renderTarget, dt)
    {
        HX.setBlendState();

        if (this._debugMode === HX.DebugRenderMode.DEBUG_NONE)
            this._composite(renderTarget, dt);
        else
            this._renderDebug(renderTarget);
    },

    _renderDebug: function(renderTarget)
    {
        HX.pushRenderTarget(renderTarget);
        if (renderTarget) HX.clear();

        switch (this._debugMode) {
            case HX.DebugRenderMode.DEBUG_COLOR:
                this._copyTexture.execute(HX.RectMesh.DEFAULT, this._gbuffer[0]);
                break;
            case HX.DebugRenderMode.DEBUG_NORMALS:
                this._debugNormals.execute(HX.RectMesh.DEFAULT, this._gbuffer[1]);
                break;
            case HX.DebugRenderMode.DEBUG_METALLICNESS:
                this._copyZChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_SPECULAR_NORMAL_REFLECTION:
                this._copyYChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_ROUGHNESS:
                this._copyXChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_DEPTH:
                this._debugDepth.execute(HX.RectMesh.DEFAULT, this._gbuffer[3]);
                break;
            case HX.DebugRenderMode.DEBUG_LIGHT_ACCUM:
                this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
                break;
            case HX.DebugRenderMode.DEBUG_TRANSPARENCY_MODE:
                this._debugTransparencyMode.execute(HX.RectMesh.DEFAULT, this._gbuffer[1]);
                break;
            case HX.DebugRenderMode.DEBUG_AO:
                if (this._aoEffect)
                    this._applyGamma.execute(HX.RectMesh.DEFAULT, this._aoEffect.getAOTexture());
                break;
            case HX.DebugRenderMode.DEBUG_SSR:
                if (this._ssrEffect)
                    this._applyGamma.execute(HX.RectMesh.DEFAULT, this._ssrTexture);
                break;
        }

        HX.popRenderTarget();
    },

    _composite: function (renderTarget, dt)
    {
        var effects = this._renderCollector._effects;

        if (effects && effects.length > 0) {
            HX.pushRenderTarget(this._hdrFront.fbo);
                this._renderEffects(dt, effects);
            HX.popRenderTarget();
        }

        HX.pushRenderTarget(renderTarget);
        HX.clear();

        // TODO: render directly to screen if last post process effect?
        // OR, provide toneMap property on camera, which gets special treatment
        if (this._gammaApplied)
            this._copyTextureToScreen.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        else
            this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);

        HX.popRenderTarget();
    },

    _renderLightAccumulation: function ()
    {
        // for some reason, not using depth breaks lights
        HX.pushRenderTarget(this._hdrFront.fbo);
        HX.clear();

        this._renderGlobalIllumination();
        this._renderDirectLights();
        HX.popRenderTarget();
    },

    /**
     * This shader applies blending and emission
     */
    _applyBlending: function ()
    {
        this._swapHDRFrontAndBack();

        // for some reason, not using depth breaks lights
        HX.pushRenderTarget(this._hdrFront.fbo);
        HX.clear();

        this._applyBlendingShader.execute(HX.RectMesh.DEFAULT, this._gbuffer, this._hdrBack.texture);

        HX.popRenderTarget();
    },

    _renderDirectLights: function ()
    {
        var lights = this._renderCollector.getLights();
        var len = lights.length;

        var i = 0;

        // renderBatch returns the first unrendered light, depending on type or properties, etc
        // so it's just a matter of calling it until i == len
        while (i < len)
            i = lights[i].renderBatch(lights, i, this);
    },

    _renderGlobalIllumination: function ()
    {
        if (this._renderCollector._globalSpecularProbe)
            this._renderCollector._globalSpecularProbe.render(this);

        if (this._ssrTexture) {
            HX.setBlendState(HX.BlendState.ALPHA);
            this._reproject.execute(HX.RectMesh.DEFAULT, this._ssrTexture, this._gbuffer[3], this._camera, this._previousViewProjection);
        }

        HX.setBlendState(HX.BlendState.ADD);
        this._copyAmbient.execute(HX.RectMesh.DEFAULT, this._gbuffer[0], this._renderCollector.ambientColor);

        if (this._renderCollector._globalIrradianceProbe)
            this._renderCollector._globalIrradianceProbe.render(this);

        if (this._aoTexture) {
            HX.setBlendState(HX.BlendState.MULTIPLY);
            this._copyTexture.execute(HX.RectMesh.DEFAULT, this._aoTexture);
            HX.setBlendState(HX.BlendState.ADD);
        }
    },

    _renderPass: function (passType, renderItems)
    {
        renderItems = renderItems || this._renderCollector.getOpaqueRenderList(passType);

        HX.RenderUtils.renderPass(this, passType, renderItems);
    },

    _renderEffects: function (dt, effects)
    {
        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            var effect = effects[i];
            if (effect.isSupported()) {
                this._renderEffect(effect, dt);
            }
        }
    },

    _createGBuffer: function ()
    {
        if (HX.EXT_DEPTH_TEXTURE) {
            this._depthBuffer = new HX.Texture2D();
            this._depthBuffer.filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._depthBuffer.wrapMode = HX.TextureWrapMode.CLAMP;
        }
        else {
            this._depthBuffer = new HX.WriteOnlyDepthBuffer();
        }

        this._gbuffer = [];

        // 0 = albedo
        // 1 = normals
        // 2 = specular
        // 3 = linear depth
        for (var i = 0; i < 4; ++i) {
            this._gbuffer[i] = new HX.Texture2D();
            this._gbuffer[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._gbuffer[i].wrapMode = HX.TextureWrapMode.CLAMP;
        }

        this._gbufferSingleFBOs = [];

        this._createGBufferFBO();

        if (HX.EXT_DEPTH_TEXTURE)
            this._linearDepthFBO = new HX.FrameBuffer(this._gbuffer[3], null);
    },

    _createGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS) {
            var targets = [this._gbuffer[0], this._gbuffer[1], this._gbuffer[2]];

            if (!HX.EXT_DEPTH_TEXTURE)
                targets[3] = this._gbuffer[3];

            this._gbufferFBO = new HX.FrameBuffer(targets, this._depthBuffer);
        }
        else {
            // if we have a depth texture, we'll linearize from that (less used bandwidth with overdraw)
            var numFBOs = HX.EXT_DEPTH_TEXTURE? 3 : 4;
            for (var i = 0; i < numFBOs; ++i)
                this._gbufferSingleFBOs[i] = new HX.FrameBuffer([this._gbuffer[i]], this._depthBuffer);
        }
    },

    _updateGBuffer: function (width, height)
    {
        if (HX.EXT_DEPTH_TEXTURE)
            //this._depthBuffer.initEmpty(width, height, HX_GL.DEPTH_COMPONENT, HX_GL.UNSIGNED_SHORT);
            this._depthBuffer.initEmpty(width, height, HX_GL.DEPTH_STENCIL, HX.EXT_DEPTH_TEXTURE.UNSIGNED_INT_24_8_WEBGL);
        else
            this._depthBuffer.init(width, height, true);

        for (var i = 0; i < this._gbuffer.length; ++i)
            this._gbuffer[i].initEmpty(width, height, HX_GL.RGBA, HX_GL.UNSIGNED_BYTE);

        this._updateGBufferFBO();

        if (this._linearDepthFBO)
            this._linearDepthFBO.init();
    },

    _updateGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS)
            this._gbufferFBO.init();
        else {
            for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
                this._gbufferSingleFBOs[i].init();
        }
    },

    dispose: function ()
    {
        this._applyGamma.dispose();
        this._copyTexture.dispose();
        this._copyXChannel.dispose();
        this._copyYChannel.dispose();
        this._copyZChannel.dispose();
        this._copyWChannel.dispose();

        this._hdrBack.dispose();
        this._hdrFront.dispose();

        for (var i = 0; i < this._gbuffer.length; ++i)
            this._gbuffer[i].dispose();

        for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
            this._gbufferSingleFBOs[i].dispose();

        if (this._gbufferFBO)
            this._gbufferFBO.dispose();
    },

    // allows effects to ping pong on the renderer's own buffers
    _swapHDRFrontAndBack: function()
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;

        HX.popRenderTarget();
        HX.pushRenderTarget(this._hdrFront.fbo);
    },

    _updateSize: function (renderTarget)
    {
        var width, height;
        if (renderTarget) {
            width = renderTarget.width;
            height = renderTarget.height;
        }
        else {
            width = Math.floor(HX.TARGET_CANVAS.width * this._scale);
            height = Math.floor(HX.TARGET_CANVAS.height * this._scale);
        }
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._updateGBuffer(this._width, this._height);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);

            if (this._scanLineMesh) this._scanLineMesh.dispose();
            this._scanLineMesh = HX.ScanlineMesh.create(height);
        }
    }
};
HX.RenderUtils =
{
    /**
     * @param renderer The actual renderer doing the rendering.
     * @param passType
     * @param renderItems
     * @param transparencyMode (optional) If provided, it will only render passes with the given transparency mode
     * @returns The index for the first unrendered renderItem in the list (depending on transparencyMode)
     * @private
     */
    renderPass: function (renderer, passType, renderItems)
    {
        var len = renderItems.length;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];

            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;

            // make sure renderstate is propagated
            shader.updateRenderState(renderItem.camera, renderItem);

            if (pass !== activePass) {
                pass.updateRenderState(renderer);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            HX.drawElements(pass._elementType, meshInstance._mesh.numIndices, 0);
        }

        HX.setBlendState(null);
        return len;
    }
};
HX.StencilState = function(reference, comparison, onStencilFail, onDepthFail, onPass, readMask, writeMask)
{
    this.enabled = true;
    this.reference = reference || 0;
    this.comparison = comparison || HX.Comparison.ALWAYS;
    this.onStencilFail = onStencilFail || HX.StencilOp.KEEP;
    this.onDepthFail = onDepthFail || HX.StencilOp.KEEP;
    this.onPass = onPass || HX.StencilOp.KEEP;
    this.readMask = readMask === undefined || readMask === null? 0xffffffff : readMask;
    this.writeMask = writeMask === undefined || writeMask === null? 0xffffffff: writeMask;
};
/**
 * This really does nothing, just renders a 2D mesh. Useful for simple stencil ops
 */
HX.NullShader = function()
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("null_vertex.glsl"), HX.ShaderLibrary.get("null_fragment.glsl"));
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
};

HX.NullShader.prototype = Object.create(HX.Shader.prototype);

HX.NullShader.prototype.execute = function(mesh)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    mesh._vertexBuffers[0].bind();
    mesh._indexBuffer.bind();

    this.updateRenderState();

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 8, 0);

    HX.enableAttributes(1);

    HX.drawElements(HX_GL.TRIANGLES, mesh.numIndices, 0);
};

/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.CustomCopyShader = function(fragmentShader)
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    var textureLocation = HX_GL.getUniformLocation(this._program, "sampler");

    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(textureLocation, 0);
};

HX.CustomCopyShader.prototype = Object.create(HX.Shader.prototype);

HX.CustomCopyShader.prototype.execute = function(rect, texture)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};


/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 */
HX.CopyChannelsShader = function(channel, copyAlpha)
{
    channel = channel || "xyzw";
    copyAlpha = copyAlpha === undefined? true : copyAlpha;

    var define = "#define extractChannels(src) ((src)." + channel + ")\n";

    if (copyAlpha) define += "#define COPY_ALPHA\n";

    HX.CustomCopyShader.call(this, define + HX.ShaderLibrary.get("copy_fragment.glsl"));
};

HX.CopyChannelsShader.prototype = Object.create(HX.CustomCopyShader.prototype);

/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 */
HX.MultiplyColorCopyShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("multiply_color_fragment.glsl"));

    HX_GL.useProgram(this._program);
    this._colorLocation = HX_GL.getUniformLocation(this._program, "color");
};

HX.MultiplyColorCopyShader.prototype = Object.create(HX.CustomCopyShader.prototype);

HX.MultiplyColorCopyShader.prototype.execute = function(rect, texture, color)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX_GL.uniform4f(this._colorLocation, color.r, color.g, color.b, color.a);
    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};


/**
 * Copies data in one texture, using a second texture's alpha information
 * @constructor
 */
HX.CopyWithSeparateAlpha = function()
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), HX.ShaderLibrary.get("copy_with_separate_alpha_fragment.glsl"));

    var textureLocation = HX_GL.getUniformLocation(this._program, "sampler");
    var alphaLocation = HX_GL.getUniformLocation(this._program, "alphaSource");

    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(textureLocation, 0);
    HX_GL.uniform1i(alphaLocation, 1);
};

HX.CopyWithSeparateAlpha.prototype = Object.create(HX.Shader.prototype);

HX.CopyWithSeparateAlpha.prototype.execute = function(rect, texture, alphaTexture)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);
    alphaTexture.bind(1);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

/**
 * Copies data in one texture, using a second texture's alpha information
 * @constructor
 */
HX.ApplyBlendingShader = function()
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("apply_blending_vertex.glsl"), HX.ShaderLibrary.get("apply_blending_fragment.glsl"));

    var colorTexLocation = HX_GL.getUniformLocation(this._program, "hx_gbufferColor");
    var normalTexLocation = HX_GL.getUniformLocation(this._program, "hx_gbufferNormals");
    var backBufferLocation = HX_GL.getUniformLocation(this._program, "hx_backbuffer");
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");
    this._pixelHeightLocation = HX_GL.getUniformLocation(this._program, "pixelHeight");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(colorTexLocation, 0);
    HX_GL.uniform1i(normalTexLocation, 1);
    HX_GL.uniform1i(backBufferLocation, 2);
};

HX.ApplyBlendingShader.prototype = Object.create(HX.Shader.prototype);

HX.ApplyBlendingShader.prototype.execute = function(rect, gbuffer, hdrBack)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    gbuffer[0].bind(0);
    gbuffer[1].bind(1);
    hdrBack.bind(2);

    HX_GL.uniform1f(this._pixelHeightLocation, 1.0 / hdrBack.height);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

/**
 * Unpack and draw depth values to screen
 */
HX.DebugDepthShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_depth_fragment.glsl"));
};

HX.DebugDepthShader.prototype = Object.create(HX.CustomCopyShader.prototype);

/**
 * Unpack and draw depth values to screen
 */
HX.DebugTransparencyModeShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_transparency_fragment.glsl"));
};

HX.DebugTransparencyModeShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Copies the texture from linear space to gamma space.
 */
HX.ApplyGammaShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
};

HX.ApplyGammaShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Draw the normals to screen.
 * @constructor
 */
HX.DebugNormalsShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_normals_fragment.glsl"));
};

HX.DebugNormalsShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Converts depth buffer values to linear depth values
 */
HX.LinearizeDepthShader = function()
{
    HX.Shader.call(this);

    this.init(HX.ShaderLibrary.get("linearize_depth_vertex.glsl"), HX.ShaderLibrary.get("linearize_depth_fragment.glsl"));

    HX_GL.useProgram(this._program);

    var textureLocation = HX_GL.getUniformLocation(this._program, "sampler");
    HX_GL.uniform1i(textureLocation, 0);

    this._rcpFrustumRangeLocation = HX_GL.getUniformLocation(this._program, "hx_rcpCameraFrustumRange");
    this._projectionLocation = HX_GL.getUniformLocation(this._program, "hx_projectionMatrix");
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");
};

HX.LinearizeDepthShader.prototype = Object.create(HX.Shader.prototype);

HX.LinearizeDepthShader.prototype.execute = function(rect, texture, camera)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);
    HX.setDepthMask(false);
    HX.setBlendState(null);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState(camera);

    texture.bind(0);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);
    HX_GL.uniform1f(this._rcpFrustumRangeLocation, 1.0/(camera.nearDistance - camera.farDistance));
    HX_GL.uniformMatrix4fv(this._projectionLocation, false, camera.projectionMatrix._m);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};


/**
 * Copies the contents from one frame projection to another projection
 * @constructor
 */
HX.ReprojectShader = function()
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), HX.ShaderLibrary.get("reproject_fragment.glsl"));

    this._reprojectionMatrix = new HX.Matrix4x4();
    var sourceLocation = HX_GL.getUniformLocation(this._program, "source");
    var depthLocation = HX_GL.getUniformLocation(this._program, "depth");

    this._reprojectionMatrixLocation = HX_GL.getUniformLocation(this._program, "reprojectionMatrix");
    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(sourceLocation , 0);
    HX_GL.uniform1i(depthLocation, 1);
};

HX.ReprojectShader.prototype = Object.create(HX.Shader.prototype);

HX.ReprojectShader.prototype.execute = function(rect, sourceTexture, depthTexture, camera, oldViewProjection)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState(camera);

    sourceTexture.bind(0);
    depthTexture.bind(1);

    this._reprojectionMatrix.multiply(oldViewProjection, camera.inverseViewProjectionMatrix);

    HX_GL.uniformMatrix4fv(this._reprojectionMatrixLocation, false, this._reprojectionMatrix._m);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};
/**
 * @constructor
 */
HX.BloomBlurPass = function(kernelSize, directionX, directionY, resolutionX, resolutionY)
{
    this._initWeights(kernelSize);

    var defines = {
        SOURCE_RES: "vec2(float(" + resolutionX + "), float(" + resolutionY + "))",
        RADIUS: "float(" + Math.ceil(kernelSize * .5) + ")",
        DIRECTION: "vec2(" + directionX + ", " + directionY + ")",
        NUM_SAMPLES: Math.ceil(kernelSize)
    };

    var vertex = HX.ShaderLibrary.get("bloom_blur_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("bloom_blur_fragment.glsl", defines);

    HX.EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
};

HX.BloomBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomBlurPass.prototype._initWeights = function(kernelSize)
{
    this._weights = [];

    var size = Math.ceil(kernelSize *.5) * 2;
    var radius = size * .5;
    var gaussian = HX.CenteredGaussianCurve.fromRadius(radius,.005);

    var total = 0;
    for (var j = 0; j < kernelSize; ++j) {
        this._weights[j] = gaussian.getValueAt(j - radius);
        total += this._weights[j];
    }

    for (var j = 0; j < kernelSize; ++j) {
        this._weights[j] *= total;
    }
};


/**
 *
 * @constructor
 */
HX.BloomEffect = function(size, strength, downScale, anisotropy)
{
    HX.Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._thresholdPass = new HX.EffectPass(null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new HX.EffectPass(HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._compositePass.blendState = HX.BlendState.ADD;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = HX.TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._size = size || 512;
    this._anisotropy = anisotropy || 1;

    this._strength = strength === undefined? 1.0 : strength;

    if (HX.EXT_HALF_FLOAT_TEXTURES_LINEAR && HX.EXT_HALF_FLOAT_TEXTURES)
        this.thresholdLuminance = 1.0;
    else
        this.thresholdLuminance = .9;

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);

    this.strength = this._strength;
};

HX.BloomEffect.prototype = Object.create(HX.Effect.prototype,
    {
        strength: {
            get: function() {
                return this._strength;
            },

            set: function(value) {
                this._strength = value;
                this._compositePass.setUniform("strength", this._strength);
            }
        }
    });

HX.BloomEffect.prototype._initTextures = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i].initEmpty(Math.ceil(this._targetWidth / this._downScale), Math.ceil(this._targetHeight / this._downScale), HX_GL.RGB, HX.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

HX.BloomEffect.prototype._initBlurPass = function()
{
    var size = this._size / this._downScale;

    var width = this._targetWidth / this._downScale;
    var height = this._targetHeight / this._downScale;
    // direction used to provide step size
    this._blurXPass = new HX.BloomBlurPass(size, 1, 0, width, height);
    this._blurYPass = new HX.BloomBlurPass(size * this._anisotropy, 0, 1, width, height);
    this._blurXPass.setTexture("sourceTexture", this._thresholdMaps[0]);
    this._blurYPass.setTexture("sourceTexture", this._thresholdMaps[1]);
};

HX.BloomEffect.prototype.draw = function(dt)
{
    if (this._renderer._width != this._targetWidth || this._renderer._height != this._targetHeight) {
        this._targetWidth = this._renderer._width;
        this._targetHeight = this._renderer._height;
        this._initTextures();
        this._initBlurPass();
    }

    HX.pushRenderTarget(this._smallFBOs[0]);
    {
        this._drawPass(this._thresholdPass);

        HX.pushRenderTarget(this._smallFBOs[1]);
        {
            this._drawPass(this._blurXPass);
        }
        HX.popRenderTarget();

        this._drawPass(this._blurYPass);
    }

    HX.popRenderTarget();

    this._drawPass(this._compositePass);
};

HX.BloomEffect.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._smallFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._smallFBOs = null;
    this._thresholdMaps = null;
};

Object.defineProperty(HX.BloomEffect.prototype, "thresholdLuminance", {
    get: function() {
        return this._thresholdLuminance;
    },

    set: function(value) {
        this._thresholdLuminance = value;
        this._thresholdPass.setUniform("threshold", value)
    }
});
/**
 *
 * @constructor
 */
HX.CopyTexturePass = function()
{
    HX.EffectPass.call(this, null, HX.ShaderLibrary.get("copy_fragment.glsl"));
};

HX.CopyTexturePass.prototype = Object.create(HX.EffectPass.prototype);

HX.CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};
/**
 *
 * @param density
 * @param tint
 * @param startDistance
 * @param height
 * @constructor
 */
HX.FogEffect = function(density, tint, startDistance)
{
    HX.Effect.call(this);

    this._fogPass = new HX.EffectPass(null, HX.ShaderLibrary.get("fog_fragment.glsl"));
    this._fogPass.blendState = HX.BlendState.INV_ALPHA;

    this.density = density === undefined? .001 : density;
    this.tint = tint === undefined? new HX.Color(1, 1, 1, 1) : tint;
    this.startDistance = startDistance === undefined? 0 : startDistance;
};

HX.FogEffect.prototype = Object.create(HX.Effect.prototype);

Object.defineProperty(HX.FogEffect.prototype, "density", {
    get: function()
    {
        return this._density;
    },
    set: function(value)
    {
        this._density = value;
        this._fogPass.setUniform("density", value);
    }
});

Object.defineProperty(HX.FogEffect.prototype, "tint", {
    get: function()
    {
        return this._tint;
    },
    set: function(value)
    {
        this._tint = value;
        this._fogPass.setUniform("tint", {x: value.r, y: value.g, z: value.b});
    }
});

Object.defineProperty(HX.FogEffect.prototype, "startDistance", {
    get: function()
    {
        return this._startDistance;
    },
    set: function(value)
    {
        this._startDistance = value;
        this._fogPass.setUniform("startDistance", value);
    }
});

HX.FogEffect.prototype.draw = function(dt)
{
    this._drawPass(this._fogPass);
};
HX.FXAA = function()
{
    HX.Effect.call(this);

    this._pass = new HX.EffectPass(null, HX.ShaderLibrary.get("fxaa_fragment.glsl"));
    this._pass.setUniform("edgeThreshold", 1/8);
    this._pass.setUniform("edgeThresholdMin", 1/16);
    this._pass.setUniform("edgeSharpness", 4.0);
};

HX.FXAA.prototype = Object.create(HX.Effect.prototype);

HX.FXAA.prototype.draw = function(dt)
{
    this._swapHDRBuffers();
    this._drawPass(this._pass);
};
/**
 * TODO: allow scaling down of textures
 *
 * @param numSamples
 * @constructor
 */
HX.HBAO = function(numRays, numSamplesPerRay)
{
    numRays = numRays || 4;
    numSamplesPerRay = numSamplesPerRay || 4;
    if (numRays > 32) numRays = 32;
    if (numSamplesPerRay > 32) numSamplesPerRay = 32;

    this._numRays = numRays;
    this._strength = 1.0;
    this._bias = .01;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    HX.Effect.call(this);
    this._aoPass = new HX.EffectPass(
        HX.ShaderLibrary.get("hbao_vertex.glsl"),
        HX.ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: numRays,
            NUM_SAMPLES_PER_RAY: numSamplesPerRay
        })
    );
    // TODO: Can probably perform this in single pass by linear interpolation (only 4 samples needed) -> can then still blur twice if needed
    this._blurPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._aoTexture = new HX.Texture2D();
    this._aoTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._aoTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._backTexture = new HX.Texture2D();
    this._backTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._fbo1 = new HX.FrameBuffer(this._aoTexture);
    this._fbo2 = new HX.FrameBuffer(this._backTexture);
};

HX.HBAO.prototype = Object.create(HX.Effect.prototype);

// every AO type should implement this
HX.HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

Object.defineProperties(HX.HBAO.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },

        set: function (value)
        {
            this._radius = value;
            this._aoPass.setUniform("halfSampleRadius", this._radius * .5);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            this._fallOffDistance = value;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
        }
    },

    bias: {
        get: function()
        {
            return this._bias;
        },
        set: function (value)
        {
            this._bias = value;
            this._aoPass.setUniform("bias", this._bias);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

HX.HBAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (HX.TextureUtils.assureSize(w, h, this._aoTexture, this._fbo1)) {
        HX.TextureUtils.assureSize(w, h, this._backTexture, this._fbo2);
        this._aoPass.setUniform("ditherScale", {x: w * .25, y: h * .25});
    }

    HX.pushRenderTarget(this._fbo1);
    {
        HX.clear(HX_GL.COLOR_BUFFER_BIT);
        this._drawPass(this._aoPass);

        HX.pushRenderTarget(this._fbo2);
        {
            HX.clear(HX_GL.COLOR_BUFFER_BIT);
            this._blurPass.setUniform("halfTexelOffset", {x: .5 / w, y: 0.0});
            this._sourceTextureSlot.texture = this._aoTexture;
            this._drawPass(this._blurPass);

            HX.popRenderTarget();
        }

        HX.clear(HX_GL.COLOR_BUFFER_BIT);
        this._blurPass.setUniform("halfTexelOffset", {x: 0.0, y: .5 / h});
        this._sourceTextureSlot.texture = this._backTexture;
        this._drawPass(this._blurPass);

        HX.popRenderTarget();
    }
};

HX.HBAO.prototype._initSampleDirTexture = function()
{
    this._sampleDirTexture = new HX.Texture2D();
    var data = [];
    var j = 0;

    for (var i = 0; i < 256; ++i)
    {
        var angle = i / 256 * 2.0 * Math.PI;
        var r = Math.cos(angle)*.5 + .5;
        var g = Math.sin(angle)*.5 + .5;
        data[j] = Math.round(r * 0xff);
        data[j+1] = Math.round(g * 0xff);
        data[j+2] = 0x00;
        data[j+3] = 0xff;
        j += 4;
    }

    this._sampleDirTexture.uploadData(new Uint8Array(data), 256, 1, false);
    this._sampleDirTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._sampleDirTexture.wrapMode = HX.TextureWrapMode.REPEAT;
};

HX.HBAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new HX.Texture2D();
    var data = [];

    var i;
    var j = 0;
    var offsets1 = [];
    var offsets2 = [];

    for (i = 0; i < 16; ++i) {
        offsets1.push(i / 16.0);
        offsets2.push(i / 15.0);
    }

    HX.shuffle(offsets1);
    HX.shuffle(offsets2);

    i = 0;

    for (var y = 0; y < 4; ++y) {
        for (var x = 0; x < 4; ++x) {
            var r = offsets1[i];
            var g = offsets2[i];

            ++i;

            data[j] = Math.round(r * 0xff);
            data[j + 1] = Math.round(g * 0xff);
            data[j + 2] = 0x00;
            data[j + 3] = 0xff;

            j += 4;
        }
    }

    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = HX.TextureWrapMode.REPEAT;
};
/**
 *
 * @param numSamples
 * @param range
 * @constructor
 */
HX.ScreenSpaceReflections = function(numSamples)
{
    HX.Effect.call(this);
    numSamples = numSamples || 5;
    this._numSamples = numSamples;

    var defines = {
        NUM_SAMPLES: numSamples
    };

    this._isSupported = !!HX.EXT_STANDARD_DERIVATIVES;
    this._stencilWriteState = new HX.StencilState(1, HX.Comparison.ALWAYS, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE);
    this._stencilReadState = new HX.StencilState(1, HX.Comparison.EQUAL, HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);
    this._stencilPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ssr_stencil_fragment.glsl"));
    this._pass = new HX.EffectPass(HX.ShaderLibrary.get("ssr_vertex.glsl", defines), HX.ShaderLibrary.get("ssr_fragment.glsl", defines));
    this._scale = .5;
    this.stepSize = Math.max(500.0 / numSamples, 1.0);
    this.maxDistance = 500.0;
    this.maxRoughness = .4;

    this._depthBuffer = new HX.WriteOnlyDepthBuffer();

    this._ssrTexture = new HX.Texture2D();
    this._ssrTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._ssrTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._fbo = new HX.FrameBuffer(this._ssrTexture, this._depthBuffer);
};

HX.ScreenSpaceReflections.prototype = Object.create(HX.Effect.prototype);


/**
 * Amount of pixels to skip per sample
 */
Object.defineProperties(HX.ScreenSpaceReflections.prototype, {
    stepSize: {
        get: function () {
            return this._stepSize;
        },

        set: function (value) {
            this._stepSize = value;
            this._pass.setUniform("stepSize", value);
        }
    },

    maxDistance: {
        get: function()
        {
            return this._stepSize;
        },

        set: function(value)
        {
            this._stepSize = value;
            this._pass.setUniform("maxDistance", value);
        }
    },

    /**
     * The maximum amount of roughness that will show any screen-space reflections
     */
    maxRoughness: {
        get: function()
        {
            return this._stepSize;
        },

        set: function(value)
        {
            this._stepSize = value;
            this._pass.setUniform("maxRoughness", value);
            this._stencilPass.setUniform("maxRoughness", value);
        }
    },

    scale: {
        get: function()
        {
            return this._scale;
        },

        set: function(value)
        {
            this._scale = value;
            if (this._scale > 1.0) this._scale = 1.0;
        }
    }
});

// every SSAO type should implement this
HX.ScreenSpaceReflections.prototype.getSSRTexture = function()
{
    return this._ssrTexture;
};

HX.ScreenSpaceReflections.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;
    if (HX.TextureUtils.assureSize(w, h, this._ssrTexture, null, HX_GL.RGBA, HX.HDR_FORMAT)) {
        this._depthBuffer.init(w, h);
        this._fbo.init();
        this._pass.setUniform("ditherTextureScale", {x: w / HX.DEFAULT_2D_DITHER_TEXTURE.width, y: h / HX.DEFAULT_2D_DITHER_TEXTURE.height});
    }

    HX.pushRenderTarget(this._fbo);
        HX.setClearColor(HX.Color.ZERO);
        HX.clear();
        HX_GL.colorMask(false, false, false, false);
        HX.pushStencilState(this._stencilWriteState);
        this._drawPass(this._stencilPass);
        HX.popStencilState();

        HX_GL.colorMask(true, true, true, true);

        HX.pushStencilState(this._stencilReadState);

        this._drawPass(this._pass);
        HX.popStencilState();
    HX.popRenderTarget();
};
/**
 *
 * @param numSamples
 */
HX.SSAO = function(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this._ssaoPass = new HX.EffectPass(null,
        HX.ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: numSamples
            }
        ));
    this._blurPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    // TODO: We could reproject
    this._ssaoTexture = new HX.Texture2D();
    this._ssaoTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._ssaoTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._backTexture = new HX.Texture2D();
    this._backTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._fbo1 = new HX.FrameBuffer(this._ssaoTexture);
    this._fbo2 = new HX.FrameBuffer(this._backTexture);
};

HX.SSAO.prototype = Object.create(HX.Effect.prototype);

// every SSAO type should implement this
HX.SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

Object.defineProperties(HX.SSAO.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },
        set: function (value)
        {
            this._radius = value;
            this._ssaoPass.setUniform("sampleRadius", this._radius);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            this._fallOffDistance = value;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});


HX.SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poissonPoints = HX.PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < this._numSamples; ++i) {
        var point = poissonPoints[i];

        // power of two, to create a bit more for closer occlusion
        samples[j++] = Math.pow(point.x, 2);
        samples[j++] = Math.pow(point.y, 2);
        samples[j++] = Math.pow(point.z, 2);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

HX.SSAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (HX.TextureUtils.assureSize(w, h, this._ssaoTexture, this._fbo1)) {
        HX.TextureUtils.assureSize(w, h, this._backTexture, this._fbo2);
        this._ssaoPass.setUniform("ditherScale", {x: w *.25, y: h *.25});
    }

    HX.pushRenderTarget(this._fbo1);
    HX.clear();
    this._drawPass(this._ssaoPass);

    HX.pushRenderTarget(this._fbo2);
    HX.clear();
    this._blurPass.setUniform("halfTexelOffset", {x: .5 / w, y: 0.0});
    this._sourceTextureSlot.texture = this._ssaoTexture;
    this._drawPass(this._blurPass);
    HX.popRenderTarget();

    HX.clear();
    this._blurPass.setUniform("halfTexelOffset", {x: 0.0, y: .5 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);
    HX.popRenderTarget();
};

HX.SSAO.prototype._initDitherTexture = function()
{
    var data = [ 126, 255, 126, 255, 135, 253, 105, 255, 116, 51, 26, 255, 137, 57, 233, 255, 139, 254, 121, 255, 56, 61, 210, 255, 227, 185, 73, 255, 191, 179, 30, 255, 107, 245, 173, 255, 205, 89, 34, 255, 191, 238, 138, 255, 56, 233, 125, 255, 198, 228, 161, 255, 85, 13, 164, 255, 140, 248, 168, 255, 147, 237, 65, 255 ];

    // in case you're wondering, this is how the list above is generated, until approved
    /*var n = new HX.Float4();
    for (var i = 0; i < 16; ++i) {
        var azimuthal = Math.random() * Math.PI * 2.0;
        var polar = Math.random() * Math.PI;
        n.fromSphericalCoordinates(1.0, azimuthal, polar);
        data[i * 4] = Math.round((n.x * .5 + .5) * 0xff);
        data[i * 4 + 1] = Math.round((n.y * .5 + .5) * 0xff);
        data[i * 4 + 2] = Math.round((n.z * .5 + .5) * 0xff);
        data[i * 4 + 3] = 0xff;
    }
    console.log(data.join(", "));*/

    this._ditherTexture = new HX.Texture2D();
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = HX.TextureWrapMode.REPEAT;
};
HX.ToneMapEffect = function(adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES)) {
        console.log("Warning: adaptive tone mapping not supported, using non-adaptive");
        this._adaptive = false;
        return;
    }

    HX.Effect.call(this);

    this._toneMapPass = this._createToneMapPass();

    if (this._adaptive) {
        this._extractLuminancePass = new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reference_fragment.glsl"));
        this._extractLuminancePass.blendState = new HX.BlendState(HX.BlendFactor.CONSTANT_ALPHA, HX.BlendFactor.ONE_MINUS_CONSTANT_ALPHA, HX.BlendOperation.ADD, new HX.Color(1.0, 1.0, 1.0, 1.0));

        this._luminanceMap = new HX.Texture2D();
        this._luminanceMap.initEmpty(256, 256, HX_GL.RGBA, HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new HX.FrameBuffer(this._luminanceMap);
        this._luminanceFBO.init();

        this._adaptationRate = 2000.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", HX.log2(this._luminanceMap._width));
    }

    this.exposure = 0.0;
};

HX.ToneMapEffect.prototype = Object.create(HX.Effect.prototype);

HX.ToneMapEffect.prototype._createToneMapPass = function()
{
    throw new Error("Abstract method called!");
};


HX.ToneMapEffect.prototype.dispose = function()
{
    HX.Effect.prototype.dispose.call(this);
    this._luminanceFBO.dispose();
    this._luminanceMap.dispose();
};

HX.ToneMapEffect.prototype.draw = function(dt)
{
    if (this._adaptive) {
        if (!this._isSupported) return;

        var amount = this._adaptationRate > 0 ? dt / this._adaptationRate : 1.0;
        if (amount > 1) amount = 1;

        this._extractLuminancePass.blendState.color.a = amount;

        HX.pushRenderTarget(this._luminanceFBO);
        this._drawPass(this._extractLuminancePass);
        this._luminanceMap.generateMipmap();
        HX.popRenderTarget();
    }

    this._swapHDRBuffers();
    this._drawPass(this._toneMapPass);
};


Object.defineProperties(HX.ToneMapEffect.prototype, {
    exposure: {
        get: function()
        {
            return this._exposure;
        },
        set: function(value)
        {
            this._exposure = value;
            if (this._isSupported)
                this._toneMapPass.setUniform("hx_exposure", Math.pow(2.0, value));
        }
    },

    /**
     * The amount of time in milliseconds for the "lens" to adapt to the frame's exposure.
     */
    adaptationRate: {
        get: function()
        {
            return this._adaptationRate;
        },

        set: function(value)
        {
            this._adaptationRate = value;
        }
    }
});


/**
 *
 * @constructor
 */
HX.ReinhardToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
};

HX.ReinhardToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.ReinhardToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions = [];

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines, extensions) + "\n" + HX.ShaderLibrary.get("tonemap_reinhard_fragment.glsl")
    );
};

/**
 *
 * @constructor
 */
HX.FilmicToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

};

HX.FilmicToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.FilmicToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions = [];

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines, extensions) + "\n" + HX.ShaderLibrary.get("tonemap_filmic_fragment.glsl")
    );
};
/**
 *
 * @constructor
 */
HX.SkeletonJoint = function()
{
    this.name = null;
    this.parentIndex = -1;
    this.inverseBindPose = new HX.Matrix4x4();
};

HX.SkeletonJoint.prototype =
{
    toString: function()
    {
        return "[SkeletonJoint]";
    }
};

/**
 *
 * @constructor
 */
HX.SkeletonJointPose = function()
{
    this.rotation = new HX.Quaternion();
    this.position = new HX.Float4();
    this.scale = 1.0;
};

HX.SkeletonJointPose.prototype =
{
    copyFrom: function(a)
    {
        this.rotation.copyFrom(a.rotation);
        this.position.copyFrom(a.position);
        this.scale = a.scale;
    },

    toString: function()
    {
        return "[SkeletonJointPose]";
    }
};

/**
 *
 * @constructor
 */
HX.SkeletonPose = function()
{
    this.jointPoses = [];
};

HX.SkeletonPose.prototype =
{
    interpolate: function(a, b, factor)
    {
        a = a.jointPoses;
        b = b.jointPoses;
        var len = a.length;

        if (this.jointPoses.length !== len) {
            this._numJoints = len;
            this.jointPoses = [];
            for (var i = 0; i < len; ++i) {
                this.jointPoses[i] = new HX.SkeletonJointPose();
            }
        }

        var target = this.jointPoses;
        for (var i = 0; i < len; ++i) {
            target[i].rotation.slerp(a[i].rotation, b[i].rotation, factor);
            target[i].position.lerp(a[i].position, b[i].position, factor);
            target[i].scale = HX.lerp(a[i].scale, b[i].scale, factor);
        }
    },

    copyFrom: function(a)
    {
        a = a.jointPoses;
        var target = this.jointPoses;
        var len = target.length;
        for (var i = 0; i < len; ++i) {
            target[i].copyFrom(a[i]);
        }

    }
};

/**
 *
 * @constructor
 */
HX.Skeleton = function()
{
    this._joints = [];
    this._name = "";
};

HX.Skeleton.prototype =
{
    get numJoints()
    {
        return this._joints.length;
    },

    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    getJoint: function(index)
    {
        return this._joints[index];
    },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};
/**
 *
 * @constructor
 */
HX.SkeletonAnimation = function(rootNode)
{
    HX.Component.call(this);
    if (rootNode instanceof HX.SkeletonClip)
        rootNode = new HX.SkeletonClipNode(rootNode);
    this._blendTree = new HX.SkeletonBlendTree(rootNode);
};

HX.SkeletonAnimation.prototype = Object.create(HX.Component.prototype,
    {
        animationNode: {
            get: function ()
            {
                return this._blendTree.rootNode;
            },
            set function(value)
            {
                this._blendTree.rootNode = value;
                if (this._entity) this._blendTree.skeleton = this._entity.skeleton;
            }
        }
    }
);

HX.SkeletonAnimation.prototype.onAdded = function()
{
    this._blendTree.skeleton = this._entity.skeleton;
};

HX.SkeletonAnimation.prototype.onUpdate = function(dt)
{
    if (this._blendTree.update(dt)) {
        var matrix = this._entity.matrix;
        var d = this._blendTree.rootJointDeltaPosition;
        matrix.prependTranslation(d);
        this._entity.matrix = matrix;
    }
    this._entity.skeletonMatrices = this._blendTree.matrices;
};
/**
 *
 * @constructor
 */
HX.SkeletonBinaryLerpNode = function()
{
    HX.SkeletonBlendNode.call(this);
    this._value = 0;
    this._child1 = null;
    this._child2 = null;
    this._minValue = 0;
    this._maxValue = 1;
    this._numJoints = 0;
};

HX.SkeletonBinaryLerpNode.prototype =
{
    get minValue()
    {
        return this._minValue;
    },

    set minValue(value)
    {
        this._minValue = value;
    },

    get maxValue()
    {
        return this._maxValue;
    },

    set maxValue(value)
    {
        this._maxValue = value;
    },

    get value()
    {
        return this._value;
    },

    set value(v)
    {
        v = HX.clamp(v, this._minValue, this._maxValue)
        if (this._value !== v)
            this._valueChanged = true;
        this._value = v;
        this._t = (this._value - this._minValue) / (this._maxValue - this._minValue);
    },

    get child1()
    {
        return this._child1;
    },

    set child1(value)
    {
        this._child1 = value;
        if (this._child2 && value.numJoints !== this._child2.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
        this._numJoints = value.numJoints;
    },

    get child2()
    {
        return this._child2;
    },

    set child2(value)
    {
        this._child2 = value;
        if (this._child1 && value.numJoints !== this._child1.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
    },

    update: function(dt)
    {
        var updated = this._child1.update(dt);
        updated = updated || this._child2.update(dt);

        var t = this._t;
        if (updated || this._valueChanged) {
            if (t > .999)
                this._pose.copyFrom(this._child1._pose);
            else if (t < .001)
                this._pose.copyFrom(this._child2._pose);
            else
                this._pose.interpolate(this._child1, this._child2, this._t);

            this._valueChanged = false;
        }
    },

    _applyValue: function(value)
    {
        this.value = value;
    },

    setValue: function(id, value)
    {
        HX.SkeletonBlendNode.prototype.setValue.call(this, id, value);
        this._child1.setValue(id, value);
        this._child2.setValue(id, value);
    },

    get numJoints() { return this._numJoints; }
};
/**
 *
 * @constructor
 */
HX.SkeletonBlendTree = function(rootNode, skeleton)
{
    this._skeleton = skeleton;
    this._rootNode = rootNode;
    this._matrices = null;
    this._globalPose = new HX.SkeletonPose();
    if (skeleton) this.skeleton = skeleton;
};

HX.SkeletonBlendTree.prototype =
{
    get skeleton() { return this._skeleton; },
    set skeleton(value)
    {
        this._skeleton = value;
        this._matrices = [];
        for (var i = 0; i < value.numJoints; ++i) {
            this._matrices[i] = new HX.Matrix4x4();
            this._globalPose.jointPoses[i] = new HX.SkeletonJointPose();
        }

    },

    get rootJointDeltaPosition() { return this._rootNode.rootJointDeltaPosition; },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    get matrices() { return this._matrices; },

    update: function(dt)
    {
        if (this._rootNode.update(dt)) {
            this._updateGlobalPose();
            this._updateMatrices();
            return true;
        }
        return false;
    },

    _updateGlobalPose: function()
    {
        var skeleton = this._skeleton;
        var numJoints = skeleton.numJoints;
        var rootPose = this._rootNode._pose.jointPoses;
        var globalPose = this._globalPose.jointPoses;

        var p = new HX.Matrix4x4();
        var c = new HX.Matrix4x4();
        var pp = new HX.Transform();
        var cc = new HX.Transform();
        var sc = new HX.Float4();
        var scale = 1.0;

        for (var i = 0; i < numJoints; ++i) {
            var localJointPose = rootPose[i];
            var globalJointPose = globalPose[i];
            var joint = skeleton.getJoint(i);

            if (joint.parentIndex < 0)
                globalJointPose.copyFrom(localJointPose);
            else {
                var parentPose = globalPose[joint.parentIndex];

                /*pp.position.copyFrom(parentPose.position);
                pp.rotation.copyFrom(parentPose.rotation);
                // should we inherit scale or not?
                //pp.scale.set(parentPose.scale, parentPose.scale, parentPose.scale);
                cc.position.copyFrom(localJointPose.position);
                cc.rotation.copyFrom(localJointPose.rotation);
                //cc.scale.set(localJointPose.scale, localJointPose.scale, localJointPose.scale);

                // inherit scale:
                //scale *= localJointPose.scale;
                scale = localJointPose.scale;
                p.compose(pp);
                c.compose(cc);
                c.append(p);

                // decompose doesn't work with negative scale -_-
                c.decompose(globalJointPose.position, globalJointPose.rotation, sc);
                globalJointPose.scale = scale;*/

                var gTr = globalJointPose.position;
                var ptr = parentPose.position;
                var pQuad = parentPose.rotation;
                pQuad.rotate(localJointPose.position, gTr);
                gTr.x += ptr.x;
                gTr.y += ptr.y;
                gTr.z += ptr.z;
                globalJointPose.rotation.multiply(pQuad, localJointPose.rotation);
                globalJointPose.scale = parentPose.scale * localJointPose.scale;
            }
        }
    },

    _updateMatrices: function()
    {
        var len = this._skeleton.numJoints;
        var matrices = this._matrices;
        var poses = this._globalPose.jointPoses;
        var skeleton = this._skeleton;
        for (var i = 0; i < len; ++i) {
            var pose = poses[i];
            var mtx = matrices[i];
            mtx.copyFrom(skeleton.getJoint(i).inverseBindPose);

            var sc = pose.scale;
            mtx.appendScale(sc, sc, sc);
            mtx.appendQuaternion(pose.rotation);
            mtx.appendTranslation(pose.position);
        }
    }
};

/**
 * An animation clip for skeletal animation
 * @constructor
 */
HX.SkeletonClip = function()
{
    this._name = null;
    this._frameRate = 24;
    this._frames = [];
    this._transferRootJoint = false;
};

HX.SkeletonClip.prototype =
{
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get frameRate()
    {
        return this._frameRate;
    },

    set frameRate(value)
    {
        this._frameRate = value;
    },

    /**
     *
     * @param frame A SkeletonPose
     */
    addFrame: function(frame)
    {
        this._frames.push(frame);
    },

    get numFrames()
    {
        return this._frames.length;
    },

    getFrame: function(index)
    {
        return this._frames[index];
    },

    get numJoints()
    {
        return this._frames[0].jointPoses.length;
    },

    get duration()
    {
        return this._frames.length / this._frameRate;
    },

    /**
     * If true, the last frame of the clip should be a duplicate of the first, but with the final position offset
     */
    get transferRootJoint()
    {
        return this._transferRootJoint;
    },

    set transferRootJoint(value)
    {
        this._transferRootJoint = value;
    },

    toString: function()
    {
        return "[SkeletonClip(name=" + this.name + ")";
    }
};

/**
 *
 * @param clip
 * @constructor
 */
HX.SkeletonClipNode = function(clip)
{
    HX.SkeletonBlendNode.call(this);
    this._clip = clip;
    this._interpolate = true;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._time = 0;
};

HX.SkeletonClipNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
        numJoints: {
            get: function() { return this._clip.numJoints; }
        },
        interpolate: {
            get: function() { return this._interpolate; },
            set: function(value) { this._interpolate = value; }
        },
        timeScale: {
            get: function() { return this._timeScale; },
            set: function(value) { this._timeScale = value; }
        },
        time: {
            get: function() { return this._time; },
            set: function(value)
            {
                this._time = value;
                this._timeChanged = true;
            }
        }
    });

HX.SkeletonClipNode.prototype.play = function()
{
    this._isPlaying = true;
};

HX.SkeletonClipNode.prototype.stop = function()
{
    this._isPlaying = false;
};

HX.SkeletonClipNode.prototype.update = function(dt)
{
    if ((!this._isPlaying || dt === 0.0) && !this._timeChanged)
        return false;

    this._timeChanged = false;

    if (this._isPlaying) {
        dt *= this._timeScale;
        this._time += dt/1000.0;
    }

    var clip = this._clip;
    var numBaseFrames = clip._transferRootJoint? clip.numFrames - 1 : clip.numFrames;
    var duration = numBaseFrames / clip.frameRate;
    var wraps = 0;

    while (this._time >= duration) {
        this._time -= duration;
        ++wraps;
    }
    while (this._time < 0) {
        this._time += duration;
        ++wraps;
    }

    var frameFactor = this._time * clip.frameRate;

    var firstIndex = Math.floor(frameFactor);
    var poseA = clip.getFrame(firstIndex);

    if (this._interpolate) {
        var secondIndex = firstIndex === clip.numFrames - 1? 0 : firstIndex + 1;
        var poseB = clip.getFrame(secondIndex);
        this._pose.interpolate(poseA, poseB, frameFactor - firstIndex);
    }
    else {
        this._pose.copyFrom(poseA);
    }

    if (clip._transferRootJoint)
        this._transferRootJointTransform(wraps);

    return true;
};

HX.SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps)
{
    var clip = this._clip;
    var lastFramePos = clip.getFrame(clip.numFrames - 1).jointPoses[0].position;
    var firstFramePos = clip.getFrame(0).jointPoses[0].position;

    var currentPos = this._pose.jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    if (this._timeScale > 0 && numWraps > 0) {
        rootDelta.x = lastFramePos.x - rootPos.x + currentPos.x - firstFramePos.x + (lastFramePos.x - firstFramePos.x) * (numWraps - 1);
        rootDelta.y = lastFramePos.y - rootPos.y + currentPos.y - firstFramePos.y + (lastFramePos.y - firstFramePos.y) * (numWraps - 1);
        rootDelta.z = lastFramePos.z - rootPos.z + currentPos.z - firstFramePos.z + (lastFramePos.z - firstFramePos.z) * (numWraps - 1);
    }
    else if (numWraps > 0) {
        rootDelta.x = firstFramePos.x - rootPos.x + currentPos.x - lastFramePos.x + (firstFramePos.x - lastFramePos.x) * (numWraps - 1);
        rootDelta.y = firstFramePos.y - rootPos.y + currentPos.y - lastFramePos.y + (firstFramePos.y - lastFramePos.y) * (numWraps - 1);
        rootDelta.z = firstFramePos.z - rootPos.z + currentPos.z - lastFramePos.z + (firstFramePos.z - lastFramePos.z) * (numWraps - 1);
    }
    else { // no wraps
        rootDelta.x = currentPos.x - rootPos.x;
        rootDelta.y = currentPos.y - rootPos.y;
        rootDelta.z = currentPos.z - rootPos.z;
    }

    this._rootPosition.copyFrom(currentPos);
    currentPos.set(0.0, 0.0, 0.0);
};

HX.SkeletonClipNode.prototype._applyValue = function(value)
{
    this.time = value * this._clip.duration;
};
HX.BulkAssetLoader = function ()
{
    this._assets = null;
    this._files = null;
    this._abortOnFail = false;
    this.onComplete = new HX.Signal();
    this.onFail = new HX.Signal();
};

HX.BulkAssetLoader.prototype =
{
    get abortOnFail()
    {
        return this._abortOnFail;
    },

    set abortOnFail(value)
    {
        this._abortOnFail = value;
    },

    getAsset: function(filename)
    {
        return this._assets[filename];
    },

    /**
     *
     * @param files An array of files or { file: "", importer: Importer } objects
     * @param importer If files is an array of filenames, the importer to use for all
     */
    load: function(files, importer)
    {
        this._files = files;
        this._assets = {};
        this._index = 0;

        if (importer) {
            for (var i = 0; i < this._files.length; ++i) {
                this._files[i] = {
                    file: this._files[i],
                    importer: importer,
                    target: null
                };
            }
        }

        this._loadQueued();
    },

    _loadQueued: function()
    {
        if (this._index === this._files.length) {
            this._notifyComplete();
            return;
        }

        var file = this._files[this._index];
        var loader = new HX.AssetLoader(file.importer);

        var self = this;
        loader.onComplete = function(asset)
        {
            var filename = file.file;
            self._assets[filename] = asset;
            ++self._index;
            self._loadQueued();
        };

        loader.onFail = function(error) {
            self._notifyFailure(error);

            if (self._abortOnFail)
                return;
            else
                // continue loading
                loader.onComplete();
        };

        loader.load(file.file, file.target);
    },

    _notifyComplete: function()
    {
        if (!this.onComplete) return;

        if (this.onComplete instanceof HX.Signal)
            this.onComplete.dispatch();
        else
            this.onComplete();
    },

    _notifyFailure: function(message)
    {
        if (!this.onFail) {
            console.warn("Importer error: " + message);
            return;
        }

        if (this.onFail instanceof HX.Signal)
            this.onFail.dispatch(message);
        else
            this.onFail(message);
    }
};
/**
 *
 * @constructor
 */
HX.HCM = function()
{
    HX.Importer.call(this, HX.TextureCube);
};

HX.HCM.prototype = Object.create(HX.Importer.prototype);

HX.HCM.prototype.parse = function(data, target)
{
    var data = JSON.parse(data);

    var urls = [
        data.files.posX,
        data.files.negX,
        data.files.posY,
        data.files.negY,
        data.files.posZ,
        data.files.negZ
    ];

    if (data.loadMips)
        this._loadMipChain(urls, target);
    else
        this._loadFaces(urls, target);
};

HX.HCM.prototype._loadFaces = function(urls, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    var images = [];
    var self = this;

    for (var i = 0; i < 6; ++i) {
        var image = new Image();
        image.nextID = i + 1;
        if (i < 5) {
            image.onload = function()
            {
                images[this.nextID].src = self.path + urls[this.nextID];
            }
        }
        // last image to load
        else {
            image.onload = function() {
                target.uploadImages(images, generateMipmaps);
                self._notifyComplete(target);
            };
        }

        image.onError = function() {
            self._notifyFailure("Failed loading texture '" + url + "'");
        };

        images[i] = image;
    }

    images[0].src = self.path + urls[0];
};

HX.HCM.prototype._loadMipChain = function(urls, target)
{
    var images = [];

    var numMips;

    var self = this;
    var firstImage = new Image();
    var realURLs = [];

    for (var i = 0; i < 6; ++i) {
        realURLs[i] = urls[i].replace("%m", "0");
    }

    firstImage.onload = function()
    {
        if (firstImage.naturalWidth != firstImage.naturalHeight || !HX.TextureUtils.isPowerOfTwo(firstImage.naturalWidth)) {
            self._notifyFailure("Failed loading mipchain: incorrect dimensions");
        }
        else {
            numMips = HX.log2(firstImage.naturalWidth) + 1;
            loadTheRest();
            images[0] = firstImage;
        }
    };

    firstImage.onerror = function()
    {
        self._notifyFailure("Failed loading texture");
    };

    firstImage.src = self.path + realURLs[0];

    function loadTheRest()
    {
        var len = numMips * 6;
        for (var i = 1; i < numMips; ++i) {
            for (var j = 0; j < 6; ++j) {
                realURLs.push(urls[j].replace("%m", i.toString()));
            }
        }

        for (var i = 1; i < len; ++i) {
            var image = new Image();
            image.nextID = i + 1;
            if (i < len - 1) {
                image.onload = function ()
                {
                    images[this.nextID].src = self.path + realURLs[this.nextID];
                }
            }
            // last image to load
            else {
                image.onload = function ()
                {
                    for (var m = 0; m < numMips; ++m)
                        target.uploadImagesToMipLevel(images.slice(m * 6, m * 6 + 6), m);

                    target._isReady = true;
                    self._notifyComplete(target);
                };
            }

            image.onError = function ()
            {
                self._notifyFailure("Failed loading texture");
            };

            images[i] = image;
        }

        images[1].src = self.path + realURLs[1];
    }
};
/**
 * The HMT file format is for file-based materials (JSON)
 * @constructor
 */
HX.HMT = function()
{
    HX.Importer.call(this, HX.Material);
    HX.HMT._initPropertyMap();
};

HX.HMT.prototype = Object.create(HX.Importer.prototype);

HX.HMT.prototype.parse = function(data, target)
{
    data = JSON.parse(data);
    this._loadShaders(data, target);
};

HX.HMT.prototype._gatherShaderFiles = function(data)
{
    var passes = data.passes;
    var files = [];
    for (var key in passes) {
        if (passes.hasOwnProperty(key)) {
            var vertex = passes[key].vertexShader;
            var fragment = passes[key].fragmentShader;
            if (files.indexOf(vertex) < 0) files.push(this._correctURL(vertex));
            if (files.indexOf(fragment) < 0) files.push(this._correctURL(fragment));
        }
    }

    return files;
};

HX.HMT.prototype._loadShaders = function(data, material)
{
    var shaders = {};
    var shaderFiles = this._gatherShaderFiles(data);
    var bulkLoader = new HX.BulkURLLoader();
    var self = this;

    bulkLoader.onComplete = function() {
        for (var i = 0; i < shaderFiles.length; ++i) {
            shaders[shaderFiles[i]] = bulkLoader.getData(shaderFiles[i]);
        }

        self._processMaterial(data, shaders, material);
        self._loadTextures(data, material);
    };
    bulkLoader.onFail = function(code)
    {
        self._notifyFailure("Error loading shaders: " + code);
    };
    bulkLoader.load(shaderFiles);
};


HX.HMT.prototype._processMaterial = function(data, shaders, material)
{
    var defines = "";
    if (this.options.defines) {
        for (var key in this.options.defines) {
            if (this.options.defines.hasOwnProperty(key)) {
                defines += "#define " + key + " " + this.options.defines[key] + "\n";
            }
        }
    }

    var passes = data.passes;

    if (passes.geometry !== undefined) this._processPass(material, passes.geometry, HX.MaterialPass.GEOMETRY_PASS, shaders, defines);

    this._applyUniforms(data, material);

    // default pre-defined texture
    material.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.HMT.prototype._processPass = function(material, passData, passType, shaders, defines)
{
    var vertexShader = shaders[this._correctURL(passData.vertexShader)];
    var fragmentShader = shaders[this._correctURL(passData.fragmentShader)];

    if (passType === HX.MaterialPass.GEOMETRY_PASS) {
        if (HX.EXT_DRAW_BUFFERS)
            this._addPass(vertexShader, fragmentShader, passData, material, passType, defines);
        else {
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_COLOR_PASS, defines, "HX_NO_MRT_GBUFFER_COLOR");
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_NORMAL_PASS, defines, "HX_NO_MRT_GBUFFER_NORMALS");
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_SPECULAR_PASS, defines, "HX_NO_MRT_GBUFFER_SPECULAR");
            if (!HX.EXT_DEPTH_TEXTURE)
                this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_LINEAR_DEPTH_PASS, defines, "HX_NO_MRT_GBUFFER_LINEAR_DEPTH");
        }

        this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.SHADOW_DEPTH_PASS, defines, "HX_SHADOW_DEPTH_PASS");
    }
    else {
        this._addPass(vertexShader, fragmentShader, passData, material, passType, defines);
    }
};

HX.HMT.prototype._addPass = function(vertexShader, fragmentShader, passData, material, passType, defines, geometryPassTypeDef)
{
    fragmentShader = HX.GLSLIncludeGeometryPass + fragmentShader;

    if (geometryPassTypeDef) {
        var geomDefines = defines + "#define " + geometryPassTypeDef + "\n";
        vertexShader = geomDefines + vertexShader;
        fragmentShader = geomDefines + fragmentShader;
    }

    var shader = new HX.Shader(defines + vertexShader, defines + fragmentShader);
    var pass = new HX.MaterialPass(shader);

    if (passData.hasOwnProperty("elementType"))
        pass.elementType = HX.HMT._PROPERTY_MAP[passData.elementType];

    if (passData.hasOwnProperty("cullMode"))
        pass.cullMode = HX.HMT._PROPERTY_MAP[passData.cullMode];

    if (passData.hasOwnProperty("depthTest"))
        pass.depthTest = HX.HMT._PROPERTY_MAP[passData.depthTest];

    if (passData.hasOwnProperty("writeDepth"))
        pass.writeDepth = passData.writeDepth;

    if (passData.hasOwnProperty("blend")) {
        var blendState = new HX.BlendState();
        var blend = passData.blend;

        if (blend.hasOwnProperty("source"))
            blendState.srcFactor = HX.HMT._PROPERTY_MAP[blend.source];

        if (blend.hasOwnProperty("destination"))
            blendState.dstFactor = HX.HMT._PROPERTY_MAP[blend.destination];

        if (blend.hasOwnProperty("operator"))
            blendState.operator = HX.HMT._PROPERTY_MAP[blend.operator];

        pass.blendState = blendState;
    }

    material.setPass(passType, pass);
};

HX.HMT.prototype._applyUniforms = function(data, material)
{
    if (!data.uniforms) return;

    for (var key in data.uniforms) {
        if (!data.uniforms.hasOwnProperty(key)) continue;

        var value = data.uniforms[key];
        if (isNaN(value))
            material.setUniform(key, {
                x: value[0],
                y: value[1],
                z: value[2],
                w: value[3]
            }, false);
        else
            material.setUniform(key, value, false);
    }
};

HX.HMT.prototype._loadTextures = function(data, material)
{
    var files = [];

    for (var key in data.textures) {
        if (data.textures.hasOwnProperty(key))
            files.push(this._correctURL(data.textures[key]));
    }

    var bulkLoader = new HX.BulkAssetLoader();
    var self = this;
    bulkLoader.onComplete = function()
    {
        for (var key in data.textures) {
            if (data.textures.hasOwnProperty(key)) {
                material.setTexture(key, bulkLoader.getAsset(self._correctURL(data.textures[key])));
            }
        }
        self._notifyComplete(material);
    };
    bulkLoader.onFail = function(message)
    {
        self._notifyFailure(message);
    };

    bulkLoader.load(files, HX.JPG);
};


HX.HMT._PROPERTY_MAP = null;

HX.HMT._initPropertyMap = function() {
    HX.HMT._PROPERTY_MAP = HX.HMT._PROPERTY_MAP || {
        back: HX_GL.BACK,
        front: HX.CullMode.FRONT,
        both: HX.CullMode.ALL,
        none: null,
        lines: HX.ElementType.LINES,
        points: HX.ElementType.POINTS,
        triangles: HX.ElementType.TRIANGLES,
        one: HX.BlendFactor.ONE,
        zero: HX.BlendFactor.ZERO,
        sourceColor: HX.BlendFactor.SOURCE_COLOR,
        oneMinusSourceColor: HX.BlendFactor.ONE_MINUS_SOURCE_COLOR,
        sourceAlpha: HX.BlendFactor.SOURCE_ALPHA,
        oneMinusSourceAlpha: HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA,
        destinationAlpha: HX.BlendFactor.DST_ALPHA,
        oneMinusDestinationAlpha: HX.BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
        destinationColor: HX.BlendFactor.DESTINATION_COLOR,
        sourceAlphaSaturate: HX.BlendFactor.SOURCE_ALPHA_SATURATE,
        add: HX.BlendOperation.ADD,
        subtract: HX.BlendOperation.SUBTRACT,
        reverseSubtract: HX.BlendOperation.REVERSE_SUBTRACT,

        // transparency modes
        additive: HX.TransparencyMode.ADDITIVE,
        alpha: HX.TransparencyMode.ALPHA,
        opaque: HX.TransparencyMode.OPAQUE,

        // depth tests
        always: HX.Comparison.ALWAYS,
        disabled: HX.Comparison.DISABLED,
        equal: HX.Comparison.EQUAL,
        greater: HX.Comparison.GREATER,
        greaterEqual: HX.Comparison.GREATER_EQUAL,
        less: HX.Comparison.LESS,
        lessEqual: HX.Comparison.LESS_EQUAL,
        never: HX.Comparison.NEVER,
        notEqual: HX.Comparison.NOT_EQUAL
    };
};
/**
 * Helix Scene files
 * @constructor
 */
HX.HSC = function()
{
    HX.Importer.call(this, HX.Scene);
};

HX.HSC.prototype = Object.create(HX.Importer.prototype);

HX.HSC.prototype.parse = function(data, target)
{
    var data = JSON.parse(data);
    if (data.version !== "0.1") throw "Incompatible file format version!";

    var objects = this._processObjects(data.objects, target);
    this._processConnections(data.connections, objects);

    this._notifyComplete(target);
};

HX.HSC.prototype._processObjects = function(definitions, scene)
{
    var objects = [];
    var len = definitions.length;

    for (var i = 0; i < len; ++i) {
        var object;
        var def = definitions[i];

        switch (def.type) {
            case "scene":
                // use existing scene instead of creating a new one
                object = scene;
                break;
            case "mesh":
                object = this._processMesh(def);
                break;
            case "model":
                object = new HX.ModelData();
                break;
            case "modelinstance":
                object = this._processModelInstance(def);
                break;
            case "material":
                object = this._processMaterial(def);
                break;
            case "dirlight":
                object = this._processDirLight(def);
                break;
            case "ptlight":
                object = this._processPointLight(def);
                break;
            case "amblight":
                object = this._processAmbientLight(def);
                break;
            default:
                console.warn("Unsupported object of type " + def.type);
                object = null;
        }

        if (object) {
            object.name = def.name;
            objects[def.id] = object;
        }

        objects.push(object);
    }

    return objects;
};

HX.HSC.prototype._processMesh = function(def)
{
    var meshData = new HX.MeshData();
    var numVertices = def.numVertices;
    var vertexData = def.vertexData;
    var data = [];

    for (var attribName in vertexData) {
        if (vertexData.hasOwnProperty(attribName)) {
            var array = vertexData[attribName];
            meshData.addVertexAttribute(attribName, array.length / numVertices, 0);
            data.push(array);
        }
    }

    var mode = 0;
    var appendNormals = !vertexData.hasOwnProperty("hx_normal");
    var appendTangents = !vertexData.hasOwnProperty("hx_tangent");

    if (appendNormals) {
        meshData.addVertexAttribute("hx_normal", 3);
        mode |= HX.NormalTangentGenerator.MODE_NORMALS;
    }

    if (appendTangents) {
        meshData.addVertexAttribute("hx_tangent", 4);
        mode |= HX.NormalTangentGenerator.MODE_TANGENTS;
    }

    var vertices = [];
    var v = 0;

    for (var i = 0; i < numVertices; ++i) {
        for (var j = 0; j < data.length; ++j) {
            var arr = data[j];
            var numComponents = arr.length / numVertices;
            for (var k = 0; k < numComponents; ++k)
            {
                vertices[v++] = arr[i * numComponents + k];
            }
        }

        var len = appendNormals? 3 : 0;
        len += appendTangents? 4 : 0;
        for (var j = 0; j < len; ++j) {
            vertices[v++] = 0;
        }
    }

    meshData.setIndexData(def.indexData);
    meshData.setVertexData(vertices, 0);

    if (mode) {
        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData, mode);
    }

    return meshData;
};

HX.HSC.prototype._processMaterial = function(def)
{
    var material = new HX.PBRMaterial();
    if (def.hasOwnProperty("color")) material.color = new HX.Color(def.color[0], def.color[1], def.color[2]);
    if (def.hasOwnProperty("metallicness")) material.metallicness = def.metallicness;
    if (def.hasOwnProperty("specularNormalReflection")) material.specularNormalReflection = def.specularNormalReflection;
    if (def.hasOwnProperty("refractiveRatio")) {
        material.refractiveRatio = def.refractiveRatio;
        material.refract = def.refractiveRatio !== 1;
    }
    if (def.hasOwnProperty("transparent")) material.transparent = def.transparent;
    if (def.hasOwnProperty("alpha")) material.alpha = def.alpha;
    if (def.hasOwnProperty("alphaThreshold")) material.alphaThreshold = def.alphaThreshold;
    if (def.hasOwnProperty("roughness")) material.setRoughness(def.roughness);
    if (def.hasOwnProperty("minRoughness")) material.minRoughness = def.minRoughness;
    if (def.hasOwnProperty("maxRoughness")) material.maxRoughness = def.maxRoughness;
    if (def.hasOwnProperty("specularMapMode")) material.specularMapMode = def.specularMapMode;  // 1: SPECULAR_MAP_ROUGHNESS_ONLY, 2: SPECULAR_MAP_ALL, 3: SPECULAR_MAP_SHARE_NORMAL_MAP

    return material;
};

HX.HSC.prototype._processDirLight = function(def)
{
    var light = new HX.DirectionalLight();
    this._processLight(def, light);
    if (def.hasOwnProperty("direction")) light.direction = new HX.Float4(def.direction[0], def.direction[1], def.direction[2]);
    if (def.hasOwnProperty("shadows")) light.castShadows = def.shadows;
    return light;
};

HX.HSC.prototype._processPointLight = function(def)
{
    var light = new HX.PointLight();
    this._processLight(def, light);
    if (def.hasOwnProperty("radius")) light.radius = def.radius;
    return light;
};

HX.HSC.prototype._processAmbientLight = function(def)
{
    var light = new HX.AmbientLight();
    this._processLight(def, light);
    return light;
};

HX.HSC.prototype._processLight = function(def, light)
{
    this._processSceneNode(def, light);
    if (def.hasOwnProperty("color")) light.color = new HX.Color(def.color[0], def.color[1], def.color[2]);
    if (def.hasOwnProperty("intensity")) light.intensity = def.intensity;
};

HX.HSC.prototype._processModelInstance = function(def)
{
    var instance = new HX.ModelInstance();
    this._processSceneNode(def, instance);
    return instance;
};

HX.HSC.prototype._processSceneNode = function(def, target)
{
    if (def.hasOwnProperty("matrix")) {
        target.transform = new HX.Matrix4x4(def.matrix);
    }
    else {
        if (def.hasOwnProperty("position")) {
            target.position.x = def.position[0];
            target.position.y = def.position[1];
            target.position.z = def.position[2];
        }
        if (def.hasOwnProperty("rotation")) {
            target.rotation.x = def.rotation[0];
            target.rotation.y = def.rotation[1];
            target.rotation.z = def.rotation[2];
            target.rotation.w = def.rotation[3];
        }
        if (def.hasOwnProperty("scale")) {
            target.scale.x = def.scale[0];
            target.scale.y = def.scale[1];
            target.scale.z = def.scale[2];
        }
    }
};

HX.HSC.prototype._processConnections = function(connections, objects)
{
    var modelLinks = [];
    var materialLinks = [];
    var len = connections.length;

    for (var i = 0; i < len; ++i) {
        var parentID = connections[i].p;
        var childID = connections[i].c;
        var parent = objects[parentID];
        var child = objects[childID];

        if (child instanceof HX.MeshData) {
            parent.addMeshData(child);
        }
        else if (child instanceof HX.ModelData) {
            // deferred until all meshdata is assigned:
            modelLinks.push({c: childID, p: connections[i].p})
        }
        else if (child instanceof HX.SceneNode) {
            parent.attach(child);
        }
        else if (child instanceof HX.Material) {
            materialLinks[parentID] = materialLinks[parentID] || [];
            materialLinks[parentID].push(child);
        }
    }

    // now all ModelDatas are complete, can assign to instances
    len = modelLinks.length;
    for (var i = 0; i < len; ++i) {
        var instance = objects[modelLinks[i].p];
        var modelData = objects[modelLinks[i].c];
        var model = new HX.Model(modelData);
        instance.init(model, materialLinks[modelLinks[i].p]);
    }
};
/**
 * Loads a jpg or png equirectangular as a cubemap
 * @constructor
 */
HX.JPG_EQUIRECTANGULAR = function()
{
    HX.Importer.call(this, HX.TextureCube, HX.Importer.TYPE_IMAGE);
};

HX.JPG_EQUIRECTANGULAR.prototype = Object.create(HX.Importer.prototype);

HX.JPG_EQUIRECTANGULAR.prototype.parse = function(data, target)
{
    var texture2D = new HX.Texture2D();
    texture2D.wrapMode = HX.TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HX.TextureUtils.equirectangularToCube(texture2D, this.options.size, generateMipmaps, target);
    texture2D.dispose();
    this._notifyComplete(target);
};

HX.PNG_EQUIRECTANGULAR = HX.JPG_EQUIRECTANGULAR;
HX.JPG = function()
{
    HX.Importer.call(this, HX.Texture2D, HX.Importer.TYPE_IMAGE);
};

HX.JPG.prototype = Object.create(HX.Importer.prototype);

HX.JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

HX.PNG = HX.JPG;
/**
 *
 * @param numFrames The amount of frames to average
 * @constructor
 */
HX.FPSCounter = function(numFrames)
{
    this._numFrames = numFrames || 1;
    this._frames = [ ];
    this._maxFPS = undefined;
    this._minFPS = undefined;
    this._currentFPS = 0;
    this._averageFPS = 0;
    this._runningSum = 0;

    for (var i = 0; i < this._numFrames; ++i)
        this._frames[i] = 0;

    this._index = 0;
};

HX.FPSCounter.prototype =
{
    /**
     * Updates the counter with a new frame time
     * @param dt The time in milliseconds for the last frame
     */
    update: function(dt)
    {
        this._currentFPS = 1000 / dt;

        this._runningSum -= this._frames[this._index];
        this._runningSum += this._currentFPS;
        this._averageFPS = this._runningSum / this._numFrames;
        this._frames[this._index++] = this._currentFPS;

        if (this._index == this._numFrames) this._index = 0;

        if (this._maxFPS === undefined || this._currentFPS > this._maxFPS)
            this._maxFPS = this._currentFPS;

        if (this._minFPS === undefined || this._currentFPS < this._minFPS)
            this._minFPS = this._currentFPS;


    },

    get lastFrameFPS()
    {
        return Math.round(this._currentFPS);
    },

    get averageFPS()
    {
        return Math.round(this._averageFPS);
    },

    get maxFPS()
    {
        return Math.round(this._maxFPS);
    },

    get minFPS()
    {
        return Math.round(this._minFPS);
    },

    reset: function()
    {
        this._maxFPS = undefined;
        this._minFPS = undefined;
    }
};
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if(!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if(!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());


/**
 * Encapsulates behaviour to handle frames and time differences.
 * @constructor
 */

HX.FrameTicker = function()
{
    this._isRunning = false;
    this._callback = undefined;
    this._dt = 0;
    this._currentTime = 0;
    this.onTick = new HX.Signal();
};

HX.FrameTicker.prototype = {
    constructor: HX.FrameTicker,

    /**
     * Starts automatically calling a callback function every animation frame.
     * @param callback Function to call when a frame needs to be processed.
     */
    start: function(callback) {
        if (this._isRunning) return;
        this._callback = callback;
        this._currentTime = this._getTime();
        this._isRunning = true;
        this._tick();
        this._tick._this = this;
    },

    /**
     * Stops calling the function.
     */
    stop: function() {
        this._isRunning = false;
    },

    /**
     * @returns {number} The time passed in between two frames
     */
    get dt() { return this._dt; },
    get time() { return this._currentTime; },

    /**
     * @private
     */
    _tick: function() {
        if (!this._isRunning) return;

        self.requestAnimationFrame(this._tick.bind(this));

        var currentTime = this._getTime();
        this._dt = currentTime - this._currentTime;
        // IsNan (on Safari?)
        if (this._dt !== this._dt) this._dt = 0;
        this._currentTime = currentTime;

        if(this._callback)
            this._callback(this._dt);

        this.onTick.dispatch(this._dt);
    },

    /**
     * @private
     */
    _getTime: function() {
        if (self.performance === undefined || self.performance.now == undefined)
            return Date.now();
        else
            return self.performance.now();
    }
};
/**
 * MultiViewProject is a project template for the simple multi-view set-ups
 * @constructor
 */
HX.MultiViewProject = function()
{
    this._initialized = false;
};

HX.MultiViewProject.prototype =
{
    //override or assign these
    onInit: function() {},
    onUpdate: function(dt) {},

    // automatically starts as well
    init: function(canvas, initOptions)
    {
        if (this._initialized) throw new Error("Already initialized project!");

        HX.init(canvas, initOptions);
        this._resizeCanvas();

        this._renderer = new HX.MultiRenderer();

        var self = this;

        window.addEventListener('resize', function()
        {
            self._resizeCanvas.call(self);
        });

        this.onInit();
        this._initialized = true;
        this.start();
    },

    addView: function(view)
    {
        this._renderer.addView(view);
    },

    removeView: function(view)
    {
        this._renderer.removeView(view);
    },

    start: function()
    {
        HX.onFrame.bind(this._update, this);
    },

    stop: function()
    {
        HX.onFrame.unbind(this._update);
    },

    get renderer()
    {
        return this._renderer;
    },

    _update: function(dt)
    {
        HX._clearGLStats();

        this.onUpdate(dt);

        this._renderer.render(dt);
    },

    _resizeCanvas: function()
    {
        this._canvas = document.getElementById('webglContainer');
        this._canvas.width = this._canvas.clientWidth;
        this._canvas.height = this._canvas.clientHeight;
    }
};
/**
 *
 * @constructor
 */
HX.NormalTangentGenerator = function()
{
    this._meshData = null;
    this._mode = 0;
    this._faceNormals = null;
    this._faceTangents = null;
    this._faceBitangents = null;
};

HX.NormalTangentGenerator.MODE_NORMALS = 1;
HX.NormalTangentGenerator.MODE_TANGENTS = 2;

HX.NormalTangentGenerator.prototype =
{
    generate: function(meshData, mode, useFaceWeights)
    {
        if (useFaceWeights === undefined) useFaceWeights = true;
        this._mode = mode === undefined? HX.NormalTangentGenerator.MODE_NORMALS | HX.NormalTangentGenerator.MODE_TANGENTS : mode;

        this._meshData = meshData;

        this._positionAttrib = meshData.getVertexAttribute("hx_position");
        this._normalAttrib = meshData.getVertexAttribute("hx_normal");
        this._tangentAttrib = meshData.getVertexAttribute("hx_tangent");
        this._uvAttrib = meshData.getVertexAttribute("hx_texCoord");
        this._positionStride = meshData.getVertexStride(this._positionAttrib.streamIndex);
        this._normalStride = meshData.getVertexStride(this._normalAttrib.streamIndex);
        this._tangentStride = meshData.getVertexStride(this._tangentAttrib.streamIndex);
        this._uvStride = meshData.getVertexStride(this._uvAttrib.streamIndex);

        this._calculateFaceVectors(useFaceWeights);
        this._calculateVertexVectors();
    },

    _calculateFaceVectors: function(useFaceWeights)
    {
        var numIndices = this._meshData._indexData.length;

        if ((this._mode & HX.NormalTangentGenerator.MODE_NORMALS) != 0) this._faceNormals = new Array(numIndices);
        if ((this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) != 0) {
            this._faceTangents = new Array(numIndices);
            this._faceBitangents = new Array(numIndices);
        }

        var temp = new HX.Float4();
        var temp1 = new HX.Float4();
        var temp2 = new HX.Float4();
        var v0 = new HX.Float4();
        var v1 = new HX.Float4();
        var v2 = new HX.Float4();
        var uv0 = new HX.Float2();
        var uv1 = new HX.Float2();
        var uv2 = new HX.Float2();
        var st1 = new HX.Float2();
        var st2 = new HX.Float2();

        var posOffset = this._positionAttrib.offset;
        var uvOffset = this._uvAttrib.offset;
        var posData = this._meshData.getVertexData(this._positionAttrib.streamIndex);
        var uvData = this._meshData.getVertexData(this._uvAttrib.streamIndex);

        for (var i = 0; i < numIndices; i += 3) {
            this._getFloat3At(i, posOffset, this._positionStride, v0, posData);
            this._getFloat3At(i + 1, posOffset, this._positionStride, v1, posData);
            this._getFloat3At(i + 2, posOffset, this._positionStride, v2, posData);
            this._getFloat2At(i, uvOffset, this._uvStride, uv0, uvData);
            this._getFloat2At(i + 1, uvOffset, this._uvStride, uv1, uvData);
            this._getFloat2At(i + 2, uvOffset, this._uvStride, uv2, uvData);

            v1.subtract(v0);
            v2.subtract(v0);

            if (this._faceNormals) {
                temp.cross(v1, v2);

                if (!useFaceWeights) temp.normalize();

                this._faceNormals[i] = temp.x;
                this._faceNormals[i + 1] = temp.y;
                this._faceNormals[i + 2] = temp.z;
            }

            if (this._faceTangents) {
                //var div = ((uv1.x - uv0.x)*(uv2.y - uv0.y) - (uv1.y - uv0.y)*(uv2.x - uv0.x));
                HX.Float2.subtract(uv1, uv0, st1);
                HX.Float2.subtract(uv2, uv0, st2);

                HX.Float4.scale(v1, st2.y, temp1);
                HX.Float4.scale(v2, st1.y, temp2);
                HX.Float4.subtract(temp1, temp2, temp);

                if (temp.lengthSqr > .001)
                    temp.normalize();

                this._faceTangents[i] = temp.x;
                this._faceTangents[i + 1] = temp.y;
                this._faceTangents[i + 2] = temp.z;

                HX.Float4.scale(v1, st2.x, temp1);
                HX.Float4.scale(v2, st1.x, temp1);
                HX.Float4.subtract(temp2, temp1, temp);
                // no need to normalize bitangent, just need it for orientation

                this._faceBitangents[i] = temp.x;
                this._faceBitangents[i + 1] = temp.y;
                this._faceBitangents[i + 2] = temp.z;
            }
        }
    },

    _calculateVertexVectors: function()
    {
        this._zeroVectors();

        var bitangents = this._faceTangents ? [] : null;
        var indexData = this._meshData._indexData;
        var normalOffset = this._normalAttrib.offset;
        var tangentOffset = this._tangentAttrib.offset;
        var normalData = this._meshData.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._meshData.getVertexData(this._tangentAttrib.streamIndex);
        var numIndices = indexData.length;

        for (var i = 0; i < numIndices; ++i) {
            var index = indexData[i];
            var normalIndex = normalOffset + index * this._normalStride;
            var tangentIndex = tangentOffset + index * this._tangentStride;
            var bitangentIndex = index * 3;
            var faceIndex = Math.floor(i / 3) * 3;

            if (this._faceNormals) {
                normalData[normalIndex] += this._faceNormals[faceIndex];
                normalData[normalIndex + 1] += this._faceNormals[faceIndex + 1];
                normalData[normalIndex + 2] += this._faceNormals[faceIndex + 2];
            }

            if (this._faceTangents) {
                tangentData[tangentIndex] += this._faceTangents[faceIndex];
                tangentData[tangentIndex + 1] += this._faceTangents[faceIndex + 1];
                tangentData[tangentIndex + 2] += this._faceTangents[faceIndex + 2];

                bitangents[bitangentIndex] += this._faceBitangents[faceIndex];
                bitangents[bitangentIndex + 1] += this._faceBitangents[faceIndex + 1];
                bitangents[bitangentIndex + 2] += this._faceBitangents[faceIndex + 2];
            }
        }

        this._normalize(bitangents);
    },

    _zeroVectors: function()
    {
        var normalData = this._meshData.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._meshData.getVertexData(this._tangentAttrib.streamIndex);
        var normalStride = this._meshData.getVertexStride(this._normalAttrib.streamIndex);
        var tangentStride = this._meshData.getVertexStride(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;

        for (var i = 0; i < numVertices; ++i) {
            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                normalData[normalIndex] = 0.0;
                normalData[normalIndex + 1] = 0.0;
                normalData[normalIndex + 2] = 0.0;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                tangentData[tangentIndex] = 0.0;
                tangentData[tangentIndex + 1] = 0.0;
                tangentData[tangentIndex + 2] = 0.0;
            }
            normalIndex += normalStride;
            tangentIndex += tangentStride;
        }
    },

    _normalize: function(bitangents)
    {
        var normalData = this._meshData.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._meshData.getVertexData(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / this._normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;
        var bitangentIndex = 0;
        var normal = new HX.Float4();
        var tangent = new HX.Float4();
        var bitangent = new HX.Float4();
        var cross = new HX.Float4();

        for (var i = 0; i < numVertices; ++i) {
            normal.x = normalData[normalIndex];
            normal.y = normalData[normalIndex + 1];
            normal.z = normalData[normalIndex + 2];

            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                normal.normalize();
                normalData[normalIndex] = normal.x;
                normalData[normalIndex + 1] = normal.y;
                normalData[normalIndex + 2] = normal.z;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                tangent.x = tangentData[tangentIndex];
                tangent.y = tangentData[tangentIndex + 1];
                tangent.z = tangentData[tangentIndex + 2];

                // can happen in singularities
                if (tangent.lengthSqr < 0.0001)
                    tangent.set(1.0, 1.0, 1.0, 1.0);
                else
                    tangent.normalize();

                bitangent.x = bitangents[bitangentIndex];
                bitangent.y = bitangents[bitangentIndex + 1];
                bitangent.z = bitangents[bitangentIndex + 2];
                cross.cross(tangent, normal);

                tangentData[tangentIndex] = tangent.x;
                tangentData[tangentIndex + 1] = tangent.y;
                tangentData[tangentIndex + 2] = tangent.z;
                tangentData[tangentIndex + 3] = HX.dot3(bitangent, cross) > 0.0? 1.0 : -1.0;
            }

            normalIndex += this._normalStride;
            tangentIndex += this._tangentStride;
        }
    },

    _getFloat3At: function(i, offset, stride, target, data)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
        target.z = data[posIndex + 2];
    },

    _getFloat2At: function(i, offset, stride, target, data)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
    }
};
/**
 * SimpleProject is a project template for the most common 1-scene, 1-camera projects
 * @constructor
 */
HX.SimpleProject = function()
{
    this._initialized = false;
};

HX.SimpleProject.prototype =
{
    //override or assign these
    onInit: function() {},
    onUpdate: function(dt) {},

    // automatically starts as well
    init: function(canvas, initOptions)
    {
        if (this._initialized) throw new Error("Already initialized project!");

        HX.init(canvas, initOptions);

        this._canvas = canvas;
        this._resizeCanvas();

        this._scene = new HX.Scene();
        this._camera = new HX.PerspectiveCamera();
        this._scene.attach(this._camera);
        this._renderer = new HX.Renderer();

        var self = this;

        window.addEventListener('resize', function()
        {
            self._resizeCanvas();
        });

        this.onInit();
        this._initialized = true;
        this.start();
    },

    start: function()
    {
        HX.onFrame.bind(this._update, this);
    },

    stop: function()
    {
        HX.onFrame.unbind(this._update);
    },

    get renderer()
    {
        return this._renderer;
    },

    get scene()
    {
        return this._scene;
    },

    set scene(value)
    {
        this._scene.detach(this._camera);
        this._scene = value;
        this._scene.attach(this._camera);
    },

    get camera()
    {
        return this._camera;
    },

    set camera(value)
    {
        this._scene.detach(this._camera);
        this._camera = value;

        if (!this._camera._parent)
            this._scene.attach(this._camera);
        else if (this._camera._scene !== this._scene)
            throw new Error("Camera attached to a different scene!");
    },

    _update: function(dt)
    {
        HX._clearGLStats();

        this.onUpdate(dt);

        this._renderer.render(this._camera, this._scene, dt);
    },

    _resizeCanvas: function()
    {
        var pixelRatio = /*window.devicePixelRatio || */1.0;
        this._canvas.width = this._canvas.clientWidth * pixelRatio;
        this._canvas.height = this._canvas.clientHeight * pixelRatio;
    }
};
/**
 * @constructor
 */
HX.StatsDisplay = function(container)
{
    this._fpsCounter = new HX.FPSCounter(30);

    this._div = document.createElement("div");
    this._div.style.position = "absolute";
    this._div.style.left = "5px";
    this._div.style.top = "5px";
    this._div.style.width = "100px";
    //this._div.style.height = "100px";
    this._div.style.background = "rgba(0, 0, 0, .5)";
    this._div.style.padding = "10px 15px 10px 15px";
    this._div.style.color = "#ffffff";
    this._div.style.fontFamily = '"Lucida Console", Monaco, monospace';
    this._div.style.fontSize = "small";

    container = container || document.getElementsByTagName("body")[0];
    container.appendChild(this._div);

    HX.onPreFrame.bind(this._update, this);
};

HX.StatsDisplay.prototype =
{
    remove: function()
    {
        this._div.parentNode.removeChild(this._div);
    },

    _update: function(dt)
    {
        this._fpsCounter.update(dt);
        this._div.innerHTML =
            "FPS: " + this._fpsCounter.averageFPS + "<br/>" +
            "Draws: " + HX._glStats.numDrawCalls + "<br/>" +
            "Tris: " + HX._glStats.numTriangles + "<br/>" +
            "Clears: " + HX._glStats.numClears + "<br/><br/>" +

            "<div style='font-size:x-small; width:100%; text-align:right;'>"+
            "Helix " + HX.VERSION + "<br/>" +
            "Hash 0x" + HX.BUILD_HASH.toString(16) + "<br/>" +
            "</div>";
    }
};
FloatController = function()
{
    HX.Component.call(this);
    this._speed = 1.0;
    this._speedMultiplier = 2.0;
    this._torquePitch = 0.0;
    this._torqueYaw = 0.0;
    this._localVelocity = new HX.Float4(0, 0, 0, 0);
    this._localAcceleration = new HX.Float4(0, 0, 0, 0);
    this._pitch = 0.0;
    this._yaw = 0.0;
    this._mouseX = 0;
    this._mouseY = 0;

    this._torque = 1.0;    // m/s^2
    this._friction = 5.0;    // 1/s

    this._maxAcceleration = this._speed;    // m/s^2
    this._maxVelocity = this._speed;    // m/s

    this._onKeyDown = null;
    this._onKeyUp = null;
};

FloatController.prototype = Object.create(HX.Component.prototype, {
    speed: {
        get: function()
        {
            return this._speed;
        },

        set: function(value)
        {
            this._speed = value;
            this._maxAcceleration = value;
            this._maxVelocity = value;
        }
    },

    shiftMultiplier: {
        get: function()
        {
            return this._speedMultiplier;
        },

        set: function(value)
        {
            this._speedMultiplier = value;
        }
    },

    pitch: {
        get: function()
        {
            return this._pitch;
        },

        set: function(value)
        {
            this._pitch = value;
        }
    },

    yaw: {
        get: function()
        {
            return this._yaw;
        },

        set: function(value)
        {
            this._yaw = value;
        }
    },

    roll: {
        get: function()
        {
            return this._roll;
        },

        set: function(value)
        {
            this._roll = value;
        }
    },

    torque: {
        get: function()
        {
            return this._torque;
        },

        set: function(value)
        {
            this._torque = value;
        }
    },

    friction: {
        get: function()
        {
            return this._friction;
        },

        set: function(value)
        {
            this._friction = value;
        }
    }
});

FloatController.prototype.onAdded = function(dt)
{
    var self = this;
    this._onKeyDown = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed * self._speedMultiplier;
                self._maxAcceleration = self._speed * self._speedMultiplier;
                break;
            case 87:
                self._setForwardForce(-1.0);
                break;
            case 83:
                self._setForwardForce(1.0);
                break;
            case 65:
                self._setStrideForce(-1.0);
                break;
            case 68:
                self._setStrideForce(1.0);
                break;
        }
    };

    this._onKeyUp = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed;
                self._maxAcceleration = self._speed;
                break;
            case 87:
            case 83:
                self._setForwardForce(0.0);
                break;
            case 65:
            case 68:
                self._setStrideForce(0.0);
                break;
        }
    };

    this._onMouseMove = function(event)
    {
        event = event || window.event;

        self._addPitch(-(self._mouseY-event.clientY) / 100);
        self._addYaw((self._mouseX-event.clientX) / 100);

        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
    };

    this._onMouseDown = function(event)
    {
        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
        document.addEventListener("mousemove", self._onMouseMove);
    };

    this._onMouseUp = function(event)
    {
        document.removeEventListener("mousemove", self._onMouseMove);
    };

    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mouseup", this._onMouseUp);
};

FloatController.prototype.onRemoved = function(dt)
{
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup", this._onMouseUp);
};

FloatController.prototype.onUpdate = function(dt)
{
    var seconds = dt * .001;

    var frictionForce = HX.Float4.scale(this._localVelocity, this._friction*seconds);
    this._localVelocity.subtract(frictionForce);

    var acceleration = HX.Float4.scale(this._localAcceleration, this._maxAcceleration*seconds);
    this._localVelocity.add(acceleration);

    var absVelocity = this._localVelocity.length;
    if (absVelocity > this._maxVelocity)
        this._localVelocity.scale(this._maxVelocity/absVelocity);

    this._pitch += this._torquePitch;
    this._yaw += this._torqueYaw;

    if (this._pitch < -Math.PI*.5) this._pitch = -Math.PI*.5;
    else if (this._pitch > Math.PI*.5) this._pitch = Math.PI*.5;

    var matrix = this.entity.matrix;
    // the original position
    var position = matrix.getColumn(3);
    var distance = HX.Float4.scale(this._localVelocity, seconds);

    matrix.fromRotationPitchYawRoll(this._pitch, this._yaw, 0.0);
    matrix.prependTranslation(distance);
    matrix.appendTranslation(position);

    this.entity.matrix = matrix;
};

// ratio is "how far the controller is pushed", from -1 to 1
FloatController.prototype._setForwardForce = function(ratio)
{
    this._localAcceleration.z = ratio * this._maxAcceleration;
};

FloatController.prototype._setStrideForce = function(ratio)
{
    this._localAcceleration.x = ratio * this._maxAcceleration;
};

FloatController.prototype._setTorquePitch = function(ratio)
{
    this._torquePitch = ratio * this._torque;
};

FloatController.prototype._setTorqueYaw = function(ratio)
{
    this._torqueYaw = ratio * this._torque;
};

FloatController.prototype._addPitch = function(value)
{
    this._pitch += value;
};

FloatController.prototype._addYaw = function(value)
{
    this._yaw += value;
};
/**
 *
 * @param target
 * @constructor
 */
OrbitController = function(lookAtTarget)
{
    HX.Component.call(this);
    this._coords = new HX.Float4(-Math.PI *.75, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new HX.Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new HX.Float4(0.0, 0.0, 0.0, 0.0);

    this.zoomSpeed = 1.0;
    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._oldMouseX = 0;
    this._oldMouseY = 0;

    this._isDown = false;
};

OrbitController.prototype = Object.create(HX.Component.prototype,
    {
        radius: {
            get: function() { return this._coords.z; },
            set: function(value) { this._coords.z = value; }
        },

        azimuth: {
            get: function() { return this._coords.x; },
            set: function(value) { this._coords.x = value; }
        },

        polar: {
            get: function() { return this._coords.y; },
            set: function(value) { this._coords.y = value; }
        }
    });

OrbitController.prototype.onAdded = function()
{
    var self = this;

    this._onMouseWheel = function(event)
    {
        self.setZoomImpulse(-event.wheelDelta * self.zoomSpeed * .0001);
    };

    this._onMouseDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        self._isDown = true;
    };

    this._onMouseMove = function(event)
    {
        if (!self._isDown) return;
        self._updateMove(event.screenX, event.screenY)
    };

    this._onTouchDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        if (event.touches.length === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            self._startPitchDistance = Math.sqrt(dx*dx + dy*dy);
            self._startZoom = self.radius;
        }

        self._isDown = true;
    };

    this._onTouchMove = function (event)
    {
        event.preventDefault();

        if (!self._isDown) return;

        var numTouches = event.touches.length;

        if (numTouches === 1) {
            var touch = event.touches[0];
            self._updateMove(touch.screenX, touch.screenY);
        }
        else if (numTouches === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            var dist = Math.sqrt(dx*dx + dy*dy);
            var diff = self._startPitchDistance - dist;
            self.radius = self._startZoom + diff * .01;
        }
    };

    this._onUp = function(event) { self._isDown = false; };

    document.addEventListener("mousewheel", this._onMouseWheel);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("touchmove", this._onTouchMove);
    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("touchstart", this._onTouchDown);
    document.addEventListener("mouseup", this._onUp);
    document.addEventListener("touchend", this._onUp);
};

OrbitController.prototype.onRemoved = function()
{
    document.removeEventListener("mousewheel", this._onMouseWheel);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("touchmove", this._onTouchMove);
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("touchstart", this._onTouchDown);
    document.removeEventListener("mouseup", this._onUp);
    document.removeEventListener("touchend", this._onUp);
};

OrbitController.prototype.onUpdate = function(dt)
{
    this._localVelocity.x *= this.dampen;
    this._localVelocity.y *= this.dampen;
    this._localVelocity.z *= this.dampen;
    this._localVelocity.x += this._localAcceleration.x;
    this._localVelocity.y += this._localAcceleration.y;
    this._localVelocity.z += this._localAcceleration.z;
    this._localAcceleration.x = 0.0;
    this._localAcceleration.y = 0.0;
    this._localAcceleration.z = 0.0;

    this._coords.add(this._localVelocity);
    this._coords.y = HX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = HX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new HX.Float4();
    pos.fromSphericalCoordinates(this._coords.z, this._coords.x, this._coords.y);
    pos.add(this.lookAtTarget);
    matrix.lookAt(this.lookAtTarget, pos, HX.Float4.Y_AXIS);
    this.entity.matrix = matrix;
};

    // ratio is "how far the controller is pushed", from -1 to 1
OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

OrbitController.prototype.setZoomImpulse = function(value)
{
    this._localAcceleration.z = value;
};

OrbitController.prototype._updateMove = function(x, y)
{
    if (this._oldMouseX !== undefined) {
        var dx = x - this._oldMouseX;
        var dy = y - this._oldMouseY;
        this.setAzimuthImpulse(dx * .0015);
        this.setPolarImpulse(-dy * .0015);
    }
    this._oldMouseX = x;
    this._oldMouseY = y;
};
HX.Debug = {
    printShaderCode: function(code)
    {
        var arr = code.split("\n");
        var str = "";
        for (var i = 0; i < arr.length; ++i) {
            str += (i + 1) + ":\t" + arr[i] + "\n";
        }
        console.log(str);
    }
};
HX.BUILD_HASH = 0xfabe;
