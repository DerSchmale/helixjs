bl_info = {
    "name": "Helix exporter",
    "description": "Exports to the Helix file format",
    "category": "Import-Export",
    "author": "David Lenaerts"
}

import bpy
from bpy_extras.io_utils import ExportHelper
from bpy.props import StringProperty
from bpy.types import Operator
from . import exporter

class ExportHelix(Operator, ExportHelper):
    """Define export properties for Helix files"""
    bl_idname = "export.helix"  # important since its how bpy.ops.import_test.some_data is constructed
    bl_label = "Export Helix"

    # ExportHelper mixin class uses this
    filename_ext = ".hx"

    filter_glob = StringProperty(
        default="*.hx",
        options={'HIDDEN'},
        maxlen=255,  # Max internal buffer length, longer would be clamped.
    )

    lighting_mode = bpy.props.EnumProperty(
        name="Lighting mode",
        description="Defines the way lights are applied in Helix",
        items=(("OFF", "Off", "Lighting is not applied to materials."),
               ("FIXED", "Fixed", "All lights are assigned to the materials in a single pass."),
               ("DYNAMIC", "Dynamic", "Lights are assigned to materials dynamically through multiple passes.")),
        default="FIXED"
    )

    export_shadows = bpy.props.BoolProperty(
        name="Export shadows",
        description="Defines whether shadow casters are exported",
        default=False
    )

    def execute(self, context):
        lighting_mode_index = 0
        if self.lighting_mode == "FIXED":
            lighting_mode_index = 1
        elif self.lighting_mode == "DYNAMIC":
            lighting_mode_index = 2

        return exporter.write_hx(context, self.filepath,
                                 lighting_mode=lighting_mode_index,
                                 export_shadows=self.export_shadows
                                 )

    def draw(self, context):
        layout = self.layout

        row = layout.row()
        row.label(text="LIGHTING:")

        row = layout.row()
        row.prop(self, "lighting_mode")

        row = layout.row()
        row.prop(self, "export_shadows")


# Only needed if you want to add into a dynamic menu
def menu_func_export(self, context):
    self.layout.operator(ExportHelix.bl_idname, text="Helix (.hx)")


def register():
    bpy.utils.register_class(ExportHelix)
    bpy.types.INFO_MT_file_export.append(menu_func_export)


def unregister():
    bpy.utils.unregister_class(ExportHelix)
    bpy.types.INFO_MT_file_export.remove(menu_func_export)


if __name__ == "__main__":
    register()

    # test call
    bpy.ops.export.helix('INVOKE_DEFAULT')