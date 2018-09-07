# ObjectMap maps blender objects to their index
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
        print("mapping " + key + " to " + str(target_index))
        if key in self.obj_map:
            self.obj_map[key].append(target_index)
        else:
            self.obj_map[key] = [target_index]

        print(str(list(self.obj_map[key])))


    def get_mapped_indices(self, src_object):
        return self.obj_map[str(src_object)]

    # if converting a single blender object results in a parent and child entity for HX (MESH Object vs Entity ->
    # MeshInstance) they can both be written to the file, but then the child needs to have this called with the Blender
    # object that was the parent
    # returns the new index
    def link(self, parent_index, child_index, meta=0):
        self.links.append((parent_index, child_index, meta))
