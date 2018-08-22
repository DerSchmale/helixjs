import {TextureCube} from "../texture/TextureCube";
import {Importer} from "./Importer";
import {MathX} from "../math/MathX";

/**
 * @classdesc
 * HCM is an Importer for Helix' json-based cube map formats. Yields a {@linkcode TextureCube} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HCM()
{
    Importer.call(this, TextureCube);
}

HCM.prototype = Object.create(Importer.prototype);

HCM.prototype.parse = function(file, target)
{
    var data = JSON.parse(file);

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

HCM.prototype._loadFaces = function(urls, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    var images = [];
    var self = this;

    var onError = function() {
        self._notifyFailure("Failed loading texture '" + urls[0] + "'");
    };

    var onLoad = function()
    {
        self._notifyProgress(this.nextID / 6);
        images[this.nextID].src = self.path + urls[this.nextID];
    };

    var onLoadLast = function() {
        target.uploadImages(images, generateMipmaps);
        self._notifyComplete(target);
    };

    for (var i = 0; i < 6; ++i) {
        var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
        image.crossOrigin = this.options.crossOrigin;
        image.nextID = i + 1;
        if (i < 5) {
            image.addEventListener("load", onLoad);
        }
        // last image to load
        else {
            image.addEventListener("load", onLoadLast);
        }

        image.addEventListener("error", onError);

        images[i] = image;
    }

    images[0].src = self.path + urls[0];
};

HCM.prototype._loadMipChain = function(urls, target)
{
    var images = [];

    var numMips;

    var self = this;
    var firstImage = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
    var realURLs = [];

    for (var i = 0; i < 6; ++i) {
        realURLs[i] = urls[i].replace("%m", "0");
    }

    firstImage.addEventListener("load", function()
    {
        if (firstImage.naturalWidth !== firstImage.naturalHeight || !MathX.isPowerOfTwo(firstImage.naturalWidth)) {
            self._notifyFailure("Failed loading mipchain: incorrect dimensions");
        }
        else {
            numMips = MathX.log2(firstImage.naturalWidth) + 1;
            loadTheRest();
            images[0] = firstImage;
        }
    });

    firstImage.addEventListener("error", function()
    {
        self._notifyFailure("Failed loading texture");
    });

    firstImage.src = self.path + realURLs[0];

    function loadTheRest()
    {
        var progressRatios = [];
        var len = numMips * 6;
        var r = 1, totalRatio = 0;
        for (var i = 1; i < numMips; ++i) {
            for (var j = 0; j < 6; ++j) {
                realURLs.push(urls[j].replace("%m", i.toString()));
                progressRatios.push(r);
                totalRatio += r;
            }
            r *= .5;
        }

        var onError = function ()
        {
            self._notifyFailure("Failed loading texture");
        };

        var onLoad = function ()
        {
            self._notifyProgress(progressRatios[this.nextID] / totalRatio);
            images[this.nextID].src = self.path + realURLs[this.nextID];
        };

        var onLoadLast = function ()
        {
            for (var m = 0; m < numMips; ++m)
                target.uploadImagesToMipLevel(images.slice(m * 6, m * 6 + 6), m);

            target._isReady = true;
            self._notifyComplete(target);
        };

        for (i = 1; i < len; ++i) {
            var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
            image.crossOrigin = self.options.crossOrigin;
            image.nextID = i + 1;
            if (i < len - 1) {
                image.addEventListener("load", onLoad);
            }
            // last image to load
            else {
                image.addEventListener("load", onLoadLast);
            }

            image.addEventListener("onError", onError);

            images[i] = image;
        }

        images[1].src = self.path + realURLs[1];
    }
};

export {HCM};