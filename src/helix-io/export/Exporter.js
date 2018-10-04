/**
 * Exporter forms a base class for exporters.
 *
 * @property onComplete A Signal called when exporting is finished. A Blob is passed as the payload.
 * @property onProgress A Signal called when exporting makes progress. A float ratio between 0 - 1 is passed as the payload.
 */
function Exporter()
{
    this.onComplete = new Signal(/*Blob*/);
    this.onProgress = new Signal(/*ratio*/);
}

Exporter.prototype = {
    /**
     * Exports the object. When done.
     */
    export: function(object)
    {

    }
};

export { Exporter };