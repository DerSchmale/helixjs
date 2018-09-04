/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var Debug = {
    printShaderCode: function(code)
    {
        var arr = code.split("\n");
        var str = "";
        for (var i = 0; i < arr.length; ++i) {
            str += (i + 1) + ":\t" + arr[i] + "\n";
        }
        console.log(str);
    },

    printSkeletonHierarchy: function(skeleton)
    {
        var str = "Skeleton: \n";
        var joints = skeleton.joints;
        for (var i = 0, len = joints.length; i < len; ++i) {
            var joint = joints[i];
            var name = joint.name;
            while (joint.parentIndex !== -1) {
                joint = joints[joint.parentIndex];
                str += "\t";
            }
            str += "\t" + name + "\n";
        }
        console.log(str);
    },

    assert: function(bool, message)
    {
        if (!bool) throw new Error(message);
    }
};
