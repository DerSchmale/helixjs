HX.Debug = {
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
        for (var i = 0; i < skeleton.numJoints; ++i) {
            var joint = skeleton.getJoint(i);
            var name = joint.name;
            while (joint.parentIndex !== -1) {
                joint = skeleton.getJoint(joint.parentIndex);
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
