# when values are strings, they need to be 0-ended

# common properties
NULL = 0            # end of property list
NAME = 1            # name of an object, value = string
URL = 2             # link to an external file defining the contents of the object, value = string
CAST_SHADOWS = 3    # used by lights and meshes
COLOR = 4           # used by lights, materials, ...

# header (meta) properties
VERSION = 10                # string
GENERATOR = 11              # string
PAD_ARRAYS = 12             # uint8, 0 or 1, optional. If omitted, 1 is assumed. Indicates that all typed arrays are
                            # preceded with 0-bytes so the start of the array is aligned to its element size.
DEFAULT_SCENE_INDEX = 13    # uint8, once parsed, yields the default index. Defaults to 0.
LIGHTING_MODE = 14          # uint8: 0: OFF, 1: FIXED, 2: DYNAMIC

# mesh properties
NUM_VERTICES = 20           # uint32
NUM_INDICES = 21            # uint32
ELEMENT_TYPE = 22           # uint8: optional, if omitted, should use TRIANGLES as default
INDEX_TYPE = 23             # uint8, either data_types.uint16 or data_types.uint32 (short vs long)
INDEX_DATA = 24             # list: length = numIndices, type defined by INDEX_TYPE.
                            # Must come after NUM_INDICES and INDEX_TYPES
VERTEX_ATTRIBUTE = 25       # value is <name [string], numComponents [uint8], componentType [uint8: data_types], uint8 streamIndex>
                            # loaders are free to use the most optimal way to put this in vertex buffers
                            # componentType in this version will always be float32!
VERTEX_STREAM_DATA = 26     # raw data list, length depends on all the attributes for the current stream. Must come
                            # after NUM_VERTICES and all VERTEX_ATTRIBUTE fields

# scene node / entity properties
POSITION = 30               # 3 float32
ROTATION = 31               # 3 float32 (quaternion, w component is calculated)
SCALE = 32                  # 3 float32

# light properties
INTENSITY = 40              # float32
RADIUS = 41                 # float32
SPOT_ANGLES = 42            # 2 float32: inner and outer angles

# mesh instance properties
