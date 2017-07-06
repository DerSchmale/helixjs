import {Component} from "./Component";

// usually subclassed
function CompositeComponent()
{
    Component.call(this);
    this._subs = [];
}

CompositeComponent.prototype = Object.create(Component.prototype);

CompositeComponent.prototype.addComponent = function(comp)
{
    if (comp._entity)
        throw new Error("Component already added to an entity!");

    this._subs.push(comp);
};

CompositeComponent.prototype.removeComponent = function(comp)
{
    var index = this._subs.indexOf(comp);
    if (index >= 0)
        this._subs.splice(index, 1);
};

CompositeComponent.prototype.onAdded = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp._entity = this._entity;
        comp.onAdded();
    }
};

CompositeComponent.prototype.onRemoved = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp.onRemoved();
        comp._entity = null;
    }
};

// by default, onUpdate is not implemented at all
//onUpdate: function(dt) {},
CompositeComponent.prototype.onUpdate = function(dt)
{
    var len = this._subs.length;
    for (var i = 0; i < len; ++i) {
        var comp = this._subs[i];
        comp.onUpdate(dt);
    }
};

export { CompositeComponent };