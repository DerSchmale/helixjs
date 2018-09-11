from .. import data, property_types, object_types
from mathutils import Vector, Quaternion


class DummyTransform:
    def __init__(self):
        self.location = Vector((0.0, 0.0, 0.0))
        self.scale = Vector((1.0, 1.0, 1.0))
        self.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))


class DummyBones(object):
    def __init__(self):
        self.targets = {}
        self.bones = []

    def __getitem__(self, item):
        return self.targets[item]

    def add_targets(self, dummy, base_name):
        self.targets[base_name + ".location"] = dummy.location
        self.targets[base_name + ".rotation_quaternion"] = dummy.rotation_quaternion
        self.targets[base_name + ".scale"] = dummy.scale

    def add_bone(self, bone):
        dummy = DummyTransform()

        # default is rest pose
        m = bone.matrix_local
        if bone.parent:
            p = bone.parent.matrix_local.inverted()
            m = p * m

        dummy.location = m.to_translation()
        dummy.rotation_quaternion = m.to_quaternion()
        dummy.scale = m.to_scale()

        self.add_targets(dummy, "pose.bones['" + bone.name + "']")
        self.add_targets(dummy, "pose.bones[\"" + bone.name + "\"]")

        self.bones.append(dummy)


def write_joint_pose(bone, file):
    data.write_vector_prop(file, property_types.POSITION, bone.location)
    data.write_quat_prop(file, property_types.ROTATION, bone.rotation_quaternion)
    data.write_vector_prop(file, property_types.SCALE, bone.scale)


def write_keyframe_at(action, frame, dummy, fps, file, object_map):
    frame_id = data.start_object(file, object_types.KEY_FRAME, object_map)
    data.write_float32_prop(file, property_types.TIME, frame / fps * 1000.0)
    data.end_object(file)

    pose_id = data.start_object(file, object_types.SKELETON_POSE, object_map)

    for c in action.fcurves:
        dummy[c.data_path][c.array_index] = c.evaluate(frame)

    for bone in dummy.bones:
        write_joint_pose(bone, file)

    data.end_object(file)
    object_map.link(frame_id, pose_id)

    return frame_id


def get_dummy_target(armature):
    obj = DummyBones()

    for bone in armature.bones:
        obj.add_bone(bone)
        pass

    return obj


# write actions for armatures, since they're different from normal animations
def write_armature_action(action, armature, file, object_map, scene):
    if object_map.has_mapped_indices(action):
        return object_map.get_mapped_indices(action)[0]

    fps = scene.render.fps

    action_id = data.start_object(file, object_types.ANIMATION_CLIP, object_map)
    data.write_string_prop(file, property_types.NAME, action.name)
    data.end_object(file)

    dummy = get_dummy_target(armature)

    # need to get all skeleton poses for these times
    for f in range(int(action.frame_range[0]), int(action.frame_range[1] + 1)):
        frame_id = write_keyframe_at(action, f, dummy, fps, file, object_map)
        object_map.link(action_id, frame_id)


    object_map.map(action, action_id)

    return action_id
