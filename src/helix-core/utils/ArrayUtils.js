/**
 * Some utilities for Arrays.
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var ArrayUtils = {
    /**
     * Randomizes the order of the elements in the array.
     */
    shuffle: function(array)
    {
        var currentIndex = array.length, temporaryValue, randomIndex ;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
};