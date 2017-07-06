export var ImageData =
{
    getFromImage: function(image)
    {
        var canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return canvas.getImageData(0, 0, canvas.width, canvas.height);
    }
};
