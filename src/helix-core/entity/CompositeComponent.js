import {Component} from "./Component";

/**
 * @classdesc
 * CompositeComponent is a {@linkcode Component} that can be used to group together multiple Components. It's usually
 * subclassed to provide easy building blocks for certain combinations of Components.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CompositeComponent()
{
    Component.call(this);
    this._subs = [];
}

Component.create(CompositeComponent);

/**
 * Adds a {@linkcode Component} to the composite. Usually called in the constructor of the subclass.
 */
CompositeComponent.prototype.addComponent = function(comp)
{
    if (comp.entity)
        throw new Error("Component already added to an entity!");

    this._subs.push(comp);
};

/**
 * Removes a {@linkcode Component} to the composite.
 */
CompositeComponent.prototype.removeComponent = function(comp)
{
    var index = this._subs.indexOf(comp);
    if (index >= 0)
        this._subs.splice(index, 1);
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onAdded = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp.entity = this.entity;
        comp.onAdded();
    }
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onRemoved = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp.onRemoved();
        comp.entity = null;
    }
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onUpdate = function(dt)
{
    var len = this._subs.length;
    for (var i = 0; i < len; ++i) {
        var comp = this._subs[i];
        comp.onUpdate(dt);
    }
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.clone = function()
{
    var clone = new CompositeComponent();
    for (var i = 0; i < this._subs.length; ++i) {
        clone.addComponent(this._subs[i].clone());
    }
    return clone;
};

export { CompositeComponent };