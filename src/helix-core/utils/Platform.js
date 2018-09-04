/**
 * Platform contains some platform-dependent utility functions.
 * @namespace
 */
import {Endian} from "./Endian";

var Platform =
{
    _isMobile: undefined,

    /**
     * Specifies whether the current platform is a mobile device or not.
     */
    get isMobile()
    {
        if (this._isMobile === undefined) {
            var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
            // This is woefully incomplete. Suggestions for alternative methods welcome.
            this._isMobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
        }

        return this._isMobile;
    },

	/**
     * Returns the endianness of the system
	 */
	get endian()
    {
		var b = new ArrayBuffer(4);
		var a = new Uint32Array(b);
		var c = new Uint8Array(b);
		a[0] = 0xdeadbeef;
		if (c[0] === 0xef) return Endian.LITTLE_ENDIAN;
		if (c[0] === 0xde) return Endian.BIG_ENDIAN;
    }
};

export { Platform };