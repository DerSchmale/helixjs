/**
 * AudioDistanceModel determines which algorithm to use to reduce the volume of the audio source as it moves away from the listener.
 * @enum
 *
 * @see AudioEmitter
 */
export var AudioDistanceModel = {
    /**
     *  A linear distance model: <code>1 - rolloffFactor * (distance - refDistance) / (maxDistance - refDistance)</code>
     */
    LINEAR: "linear",

    /**
     * An inverse distance model: <code>refDistance / (refDistance + rolloffFactor * (distance - refDistance))</code>
     */
    INVERSE: "inverse",

    /**
     * An exponential distance model: <code>pow(distance / refDistance, -rolloffFactor)</code>
     */
    EXPONENTIAL: "exponential"
};