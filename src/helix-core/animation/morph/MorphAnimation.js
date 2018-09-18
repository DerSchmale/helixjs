import {Component} from "../../entity/Component";
import {MorphPose} from "./MorphPose";
import {MeshInstance} from "../../mesh/MeshInstance";

var nameCounter = 0;

/**
 * @classdesc
 * MorphAnimation is a {@linkcode Component} that can be added to an Entity to control morph target animations. The Mesh
 * objects used by the Entity's MeshInstance components must contain morph targets assigned with
 * {@linkcode Mesh#addMorphTarget}. Up to 8 morph targets can be active at a time. If more morph targets have a weight
 * assigned to them, only those with the highest weights are used.
 *
 * @constructor
 *
 * @param [morphPose] An optional MorphPose. This allows sharing poses across entities.
 *
 * @see {@linkcode MorphPose}
 * @see {@linkcode MorphTarget}
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphAnimation(morphPose)
{
    Component.call(this);

	this.name = "hx_morphanimation_" + (nameCounter++);

    if (morphPose) {
        this._morphPose = morphPose;
	}
	else {
		this._morphPose = new MorphPose();
	}
}

Component.create(MorphAnimation,
    {
        morphPose: {
            get: function() { return this._morphPose; },
            set: function(value) {
                this._morphPose = value;
                this._assignMorphPose(value);
            }
        }
    }
);

/**
 * Sets the weight of the morph target with the given name.
 * @param {string} name The name of the morph target to influence.
 * @param {number} value The new weight of the morph target.
 */
MorphAnimation.prototype.setWeight = function(name, value)
{
    this._morphPose.setWeight(name, value);
};

/**
 * @ignore
 */
MorphAnimation.prototype.onAdded = function()
{
	this.entity.morphPose = this._morphPose;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onRemoved = function()
{
	this.entity.morphPose = null;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onUpdate = function(dt)
{
    this._morphPose.update();
};


MorphAnimation.prototype.clone = function()
{
	var clone = new MorphAnimation(this._morphPose.clone());
	clone.name = this.name;
	return clone;
};

export { MorphAnimation };