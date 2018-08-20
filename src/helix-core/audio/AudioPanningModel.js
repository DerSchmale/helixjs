/**
 * AudioPanningModel determines which spatialisation algorithm to use to position the audio in 3D space.
 * @enum
 *
 * @see AudioEmitter
 */
export var AudioPanningModel = {
    /**
     * Represents the equal-power panning algorithm, generally regarded as simple and efficient.
     */
    EQUAL_POWER: "equalpower",

    /**
     * Renders a stereo output of higher quality than equalpower — it uses a convolution with measured impulse responses from human subjects.
     */
    HRTF: "HRTF"
};