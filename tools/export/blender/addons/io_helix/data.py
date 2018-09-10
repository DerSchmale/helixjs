import struct

NULL_MARK = 0

num_started = 0
num_ended = 0


def reset():
    global num_started
    global num_ended
    num_started = 0
    num_ended = 0


# returns the index of the current object
def start_object(file, type, object_map):
    global num_started
    global num_ended
    assert num_started == num_ended
    num_started += 1
    c = object_map.add()
    file.write(struct.pack("<L", type));
    return c


def start_property(file, type):
    file.write(struct.pack("<L", type));


def write_string_prop(file, prop, value):
    """Writes a property with a 0-ended string to a file"""
    file.write(struct.pack("<L", prop))
    file.write(value.encode("utf-8"))
    file.write(struct.pack("<B", 0))


def write_uint8_prop(file, prop, value):
    file.write(struct.pack("<LB", prop, value))


def write_uint16_prop(file, prop, value):
    file.write(struct.pack("<LH", prop, value))


def write_uint32_prop(file, prop, value):
    file.write(struct.pack("<LL", prop, value))


def write_int8_prop(file, prop, value):
    file.write(struct.pack("<Lb", prop, value))


def write_int16_prop(file, prop, value):
    file.write(struct.pack("<Lh", prop, value))


def write_int32_prop(file, prop, value):
    file.write(struct.pack("<Ll", prop, value))


def write_float32_prop(file, prop, value):
    file.write(struct.pack("<Lf", prop, value))


def write_float64_prop(file, prop, value):
    file.write(struct.pack("<Ld", prop, value))


def write_bytearray_prop(file, prop, value):
    file.write(struct.pack("<L", prop))
    file.write(value)


def write_uint16_array_prop(file, prop, value):
    file.write(struct.pack("<L", prop))
    pad(file, 2)
    for v in value:
        file.write(struct.pack("<H", v))


def write_uint32_array_prop(file, prop, value):
    file.write(struct.pack("<L", prop))
    pad(file, 4)
    for v in value:
        file.write(struct.pack("<L", v))


def write_float32_array_prop(file, prop, value):
    file.write(struct.pack("<L", prop))
    pad(file, 4)
    for v in value:
        file.write(struct.pack("<f", v))


def write_affine_matrix_prop(file, prop, mat):
    start_property(file, prop)
    for c in range(0, 4):
        file.write(struct.pack("<fff", mat[0][c], mat[1][c], mat[2][c]))



def write_vector_prop(file, prop, vec):
    file.write(struct.pack("<Lfff", prop, vec.x, vec.y, vec.z))


def write_quat_prop(file, prop, quat):
    file.write(struct.pack("<Lffff", prop, quat.x, quat.y, quat.z, quat.w))


def write_color_prop(file, prop, col):
    file.write(struct.pack("<Lfff", prop, col.r, col.g, col.b))


def write_color_alpha_prop(file, prop, col, alpha):
    file.write(struct.pack("<Lffff", prop, col.r, col.g, col.b, alpha))


def end_object(file):
    global num_started
    global num_ended
    num_ended += 1
    assert num_started == num_ended
    file.write(struct.pack("<L", NULL_MARK))


def end_object_list(file):
    file.write(struct.pack("<L", NULL_MARK))


def end_header(file):
    file.write(struct.pack("<L", NULL_MARK))


def pad(file, alignment):
    while file.tell() % alignment != 0:
        file.write(struct.pack("<B", 0))