// hijacks a general property (must not be a function) and triggers a signal if so
// experimental class, really should only be used internally for private objects by its owner
HX.PropertyListener = function()
{
    this._enabled = true;
    this.onChange = new HX.Signal();
    this._targets = [];
};

HX.PropertyListener.prototype =
{
    getEnabled: function()
    {
        return this._enabled;
    },

    setEnabled: function(value)
    {
        this._enabled = value;
    },

    add: function(targetObj, propertyName)
    {
        var index = this._targets.length;
        this._targets.push(
            {
                object: targetObj,
                propertyName: propertyName,
                value: targetObj[propertyName]
            }
        );

        var wrapper = this;
        Object.defineProperty(targetObj, propertyName, {
            get: function() {
                return wrapper._targets[index].value;
            },
            set: function(val) {
                var target = wrapper._targets[index];
                if (val !== target.value) {
                    target.value = val;
                    if (wrapper._enabled)
                        wrapper.onChange.dispatch();
                }
            }
        });
    },

    detach: function(obj, propertyName)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var target = this._targets[i];
            if (target.object === obj && target.propertyName === propertyName) {
                delete target.object[target.propertyName];
                target.object[target.propertyName] = target.value;
                this._targets.splice(i--, 1);
            }
        }
    }
};