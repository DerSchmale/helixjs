// this is used to represent the file contents itself, not translated to connected nodes yet
function FBXRecord()
{
    this.name = "";
    this.data = [];
    this.children = [];
}

FBXRecord.prototype =
{
    getChildByName: function(name)
    {
        var len = this.children.length;
        for (var i = 0; i < len; ++i) {
            var child = this.children[i];
            if (child.name === name) return child;
        }
    },

    printDebug: function (printData, lvl)
    {
        if (printData === undefined) printData = true;
        if (lvl === undefined) lvl = 0;

        var padding = "";
        for (var i = 0; i < lvl; ++i)
            padding += "\t";

        console.log(padding + this.name);

        if (printData && this.data.length > 0) {
            console.log(padding + "\t[data] {");
            for (var i = 0; i < this.data.length; ++i) {
                console.log(padding + "\t\t[" + i + "] : " + this.data[i]);
            }
            console.log(padding + "}");
        }

        for (var i = 0; i < this.children.length; ++i)
            this.children[i].printDebug(printData, lvl + 1);
    }
};

export { FBXRecord };