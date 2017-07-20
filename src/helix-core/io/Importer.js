import {URLLoader} from "./URLLoader";
import {Signal} from "../core/Signal";

/**
 * @classdesc
 * A base class for importers.
 *
 * @ignore
 * @param containerType
 * @param dataType
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Importer(containerType, dataType)
{
    this._dataType = dataType === undefined? URLLoader.DATA_TEXT : dataType;
    this._containerType = containerType;
    this.onComplete = null;
    this.onFail = null;
    this.fileMap = null;
    // be able to pass importer specific settings. crossOrigin is used for images, fe.
    this.options = {};
    this.path = "";
    this.filename = "";
}

Importer.prototype =
    {
        get dataType() { return this._dataType; },
        createContainer: function() { return new this._containerType(); },

        parse: function(data, target) {},

        _notifyComplete: function(asset)
        {
            if (!this.onComplete) return;

            if (this.onComplete instanceof Signal)
                this.onComplete.dispatch(asset);
            else
                this.onComplete(asset);
        },

        _notifyFailure: function(message)
        {
            if (this.onFail instanceof Signal) {
                if (!this.onFail.hasListeners) {
                    console.error(message);
                }
                this.onFail.dispatch(message);
            }
            else
                this.onFail(message);
        },

        // expresses a url in the file relative to the original file being loaded
        _correctURL: function(url)
        {
            return this.path + (this.fileMap.hasOwnProperty(url)? this.fileMap[url] : url).replace("\\", "/");
        }
    };

Importer.TYPE_TEXT = URLLoader.DATA_TEXT;
Importer.TYPE_BINARY = URLLoader.DATA_BINARY;
Importer.TYPE_IMAGE = 2;

export { Importer };