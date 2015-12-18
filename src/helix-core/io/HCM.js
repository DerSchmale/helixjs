HX.HCM = function()
{
    HX.AssetParser.call(this, HX.TextureCube);
};

HX.HCM.prototype = Object.create(HX.AssetParser.prototype);

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