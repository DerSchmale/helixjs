/**
 * ASH is an exporter for SphericalHarmonicsRGB objects (L2 spherical harmonics).
 */
import {Exporter} from "../Exporter";

function ASH()
{
    Exporter.call(this);
}

ASH.prototype = Object.create(Exporter.prototype);

/**
 * Exports a SphericalHarmonicsRGB object.
 */
Exporter.prototype.export = function(sphericalHarmonics)
{
    var str = "# Generated with Helix\n";

    var sh = sphericalHarmonics._coefficients;

    var n = 0;
    for (var l = 0; l < 3; ++l) {
        str += "\nl=" + l + ":\n" ;
        for (var m = -l; m <= l; ++m) {
            str += "m=" + m + ": ";
            str += sh[n].r + " " + sh[n].g + " " + sh[n].b + "\n";
            ++n;
        }
    }

    this.onComplete.dispatch(new Blob([str], {type: "text/plain;charset=utf-8"}));
};

export { ASH };