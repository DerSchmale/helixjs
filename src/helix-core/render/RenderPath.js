/**
 * @ignore
 */
var RenderPath = {
    // forward with dynamic light picking
    FORWARD_DYNAMIC: 0,
    // forward with fixed assigned set of lights
    FORWARD_FIXED: 1,

    // WebGL 2 could use a separate render path supporting dynamic loops

    NUM_PATHS: 2
};

export { RenderPath };