from enum import IntEnum

class DataType(IntEnum):
    INT8 = 10
    INT16 = 11
    INT32 = 12
    UINT8 = 20
    UINT16 = 21
    UINT32 = 22
    FLOAT32 = 30
    FLOAT64 = 31


class ElementType(IntEnum):
    POINTS = 1
    LINES = 2
    LINE_STRIP = 3
    LINE_LOOP = 4
    TRIANGLES = 5
    TRIANGLE_STRIP = 6
    TRIANGLE_FAN = 7


class ObjectType(IntEnum):
    NULL = 0
    SCENE = 1
    SCENE_NODE = 2
    ENTITY = 3
    MESH = 4
    BASIC_MATERIAL = 5
    MESH_INSTANCE = 6
    SKELETON = 7
    SKELETON_JOINT = 8
    DIR_LIGHT = 9
    SPOT_LIGHT = 10
    POINT_LIGHT = 11
    AMBIENT_LIGHT = 12
    LIGHT_PROBE = 13
    PERSPECTIVE_CAMERA = 14
    ORTHOGRAPHIC_CAMERA = 15
    TEXTURE_2D = 16
    TEXTURE_CUBE = 17
    BLEND_STATE = 18
    ANIMATION_CLIP = 19
    SKELETON_ANIMATION = 20
    SKELETON_POSE = 21
    KEY_FRAME = 22
    SKYBOX = 23
    ENTITY_PROXY = 24


class PropertyType(IntEnum):
    # common properties
    NULL = 0
    NAME = 1
    URL = 2
    CAST_SHADOWS = 3
    COLOR = 4
    COLOR_ALPHA = 5

    # header (meta) properties
    VERSION = 10
    GENERATOR = 11
    PAD_ARRAYS = 12
    DEFAULT_SCENE_INDEX = 13
    LIGHTING_MODE = 14

    # mesh properties
    NUM_VERTICES = 20
    NUM_INDICES = 21
    ELEMENT_TYPE = 22
    INDEX_TYPE = 23
    INDEX_DATA = 24
    VERTEX_ATTRIBUTE = 25
    VERTEX_STREAM_DATA = 26

    # scene node / entity properties
    POSITION = 30
    ROTATION = 31
    SCALE = 32
    VISIBLE = 33

    # light properties
    INTENSITY = 40
    RADIUS = 41
    SPOT_ANGLES = 42

    # texture properties
    WRAP_MODE = 50
    FILTER = 51

    # material properties
    # COLOR = 4
    USE_VERTEX_COLORS = 60
    ALPHA = 61
    EMISSIVE_COLOR = 62
    SPECULAR_MAP_MODE = 63
    METALLICNESS = 64
    SPECULAR_REFLECTANCE = 65
    ROUGHNESS = 66
    ROUGHNESS_RANGE = 67
    ALPHA_THRESHOLD = 68
    LIGHTING_MODEL = 69
    CULL_MODE = 70
    BLEND_STATE = 71
    WRITE_DEPTH = 72
    WRITE_COLOR = 73

    # blend state properties
    BLEND_STATE_SRC_FACTOR = 80
    BLEND_STATE_DST_FACTOR = 81
    BLEND_STATE_OPERATOR = 82
    BLEND_STATE_SRC_FACTOR_ALPHA = 83
    BLEND_STATE_DST_FACTOR_ALPHA = 84
    BLEND_STATE_OPERATOR_ALPHA = 85

    # camera properties
    CLIP_DISTANCES = 90
    FOV = 91

    # skeleton / bone properties
    INVERSE_BIND_POSE = 100

    # animation properties
    TIME = 110
    LOOPING = 111
    PLAYBACK_RATE = 112
