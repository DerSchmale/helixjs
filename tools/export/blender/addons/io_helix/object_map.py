# @author derschmale <http://www.derschmale.com>

map = None


def init():
    global object_map
    object_map = ObjectMap()


def add():
    return object_map.add()


def map(src_object, target_index):
    object_map.map(src_object, target_index)


def has_mapped_indices(src_object):
    return object_map.has_mapped_indices(src_object)


def get_mapped_indices(src_object):
    return object_map.get_mapped_indices(src_object)


def link(parent_index, child_index, meta=0):
    object_map.link(parent_index, child_index, meta)


def get_links():
    return object_map.links


# ObjectMap maps blender objects to their index in the file, and keeps parentage links
class ObjectMap:
    def __init__(self):
        self.obj_map = {}
        self.links = []
        self.count = 0

    # if converting a single blender object results in multiple objects at the same level, num can be assigned
    def add(self):
        c = self.count
        self.count += 1
        return c

    # allows linking a single Blender object to indices of objects written in the file
    # for example useful when we encounter a Mesh, to link it to the various HX.Mesh objects
    def map(self, src_object, target_index):
        key = str(src_object)
        if key in self.obj_map:
            self.obj_map[key].append(target_index)
        else:
            self.obj_map[key] = [target_index]

    def has_mapped_indices(self, src_object):
        return str(src_object) in self.obj_map

    def get_mapped_indices(self, src_object):
        return self.obj_map[str(src_object)]

    # if converting a single blender object results in a parent and child entity for HX (MESH Object vs Entity ->
    # MeshInstance) they can both be written to the file, but then the child needs to have this called with the Blender
    # object that was the parent
    # returns the new index
    def link(self, parent_index: int, child_index: int, meta: int=0):
        if parent_index is None:
            raise ValueError("parent_index cannot be None!")
        if child_index is None:
            raise ValueError("child_index cannot be None!")

        self.links.append((parent_index, child_index, meta))
