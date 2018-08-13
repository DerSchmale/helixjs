/**
 * Bitfield is a bitfield that allows more than 32 bits.
 *
 * @ignore
 * @constructor
 */


function Bitfield()
{
    this._hash = [];
}

Bitfield.prototype = {
    isBitSet: function(index) {
        var i = index >> 5; // divide by 32 gives the array index for each overshoot of 32 bits
        index &= ~(i << 5); // clear the bits used to find the array index

        return this._hash[i] & (1 << index);
    },

    setBit: function(index) {
        var hash = this._hash;
        var i = index >> 5;
        index &= ~(i << 5);
        hash[i] = (hash[i] || 0) | (1 << index);
    },

    clearBit: function(index) {
        var hash = this._hash;
        var i = index >> 5;
        index &= ~(i << 5);
        hash[i] = (hash[i] || 0) & ~(1 << index);
    },

    zero: function() {
        var hash = this._hash;
        var l = hash.length;
        for (var i = 0; i < l; ++i)
            hash[i] = 0;
    },

    OR: function(b) {
        var hash = this._hash;
        b = b._hash;

        var l = Math.max(hash.length, b.length);

        for (var i = 0; i < l; ++i)
            hash[i] = (hash[i] || 0) | (b[i] || 0);
    },

    AND: function(b) {
        var hash = this._hash;
        b = b._hash;

        var l = Math.max(hash.length, b.length);

        for (var i = 0; i < l; ++i)
            hash[i] = (hash[i] || 0) & (b[i] || 0);
    },

    NOT: function() {
        var hash = this._hash;
        var l = hash.length;
        for (var i = 0; i < l; ++i)
            hash[i] = ~(hash[i] || 0);
    },

    /**
     * Checks if all bits of b are also set in this
     */
    contains: function(b) {
        var hash = this._hash;
        var bHash = b._hash;
        var l = bHash.length;

        for (var i = 0; i < l; ++i) {
            var bi = bHash[i];
            if ((hash[i] & bi) !== bi)
                return false;
        }

        return true;
    },

    clone: function()
    {
        var b = new Bitfield();
        var l = this._hash.length;

        for (var i = 0; i < l; ++i)
            b._hash[i] = this._hash[i];

        return b;
    },

    toString: function() {
        var str = "";

        var hash = this._hash;
        var l = hash.length;

        if (l === 0) return "0b0";

        for (var i = 0; i < l; ++i) {
            var s = (hash[i] || 0).toString(2);
            while (s.length < 32)
                s = "0" + s;
            str = s + str;
        }

        return "0b" + str;
    }
};

export { Bitfield };