/**
 * Platform contains some platform-dependent utility functions.
 * @namespace
 */
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
    }
};

export { Platform };