// channel can be either x, y, z, w or any 4-component swizzle
// default is xyzw
HX.CopyTextureShader = function(channel, color)
{
    HX.Shader.call(this);

    channel = channel || "xyzw";

    this.init(HX.CopyTextureShader._vertexShader, HX.CopyTextureShader.getFragmentShader(channel, color));

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.CopyTextureShader.prototype = Object.create(HX.Shader.prototype);

HX.CopyTextureShader.prototype.execute = function(rect, texture)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.CopyTextureShader._vertexShader = "\
    precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute vec2 hx_texCoord;\
\
    varying vec2 uv;\
\
    void main()\
    {\
        uv = hx_texCoord;\
        gl_Position = hx_position;\
    }";

HX.CopyTextureShader.getFragmentShader = function(channel, color)
{
    return "\
       precision mediump float;\
       \
       varying vec2 uv;\
       \
       uniform sampler2D sampler;\
       \
       void main()\
       {\
           gl_FragColor = vec4(texture2D(sampler, uv)."+channel+");\
       }";
};

HX.ApplyGammaShader = function()
{
    HX.Shader.call(this);

    this.init(HX.ApplyGammaShader._vertexShader, HX.GLSLIncludeGeneral + HX.ApplyGammaShader._fragmentShader);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.ApplyGammaShader.prototype = Object.create(HX.Shader.prototype);

HX.ApplyGammaShader.prototype.execute = function(rect, texture)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.ApplyGammaShader._vertexShader = "\
    precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute vec2 hx_texCoord;\
\
    varying vec2 uv;\
\
    void main()\
    {\
        uv = hx_texCoord;\
        gl_Position = hx_position;\
    }";

HX.ApplyGammaShader._fragmentShader = "\
    precision mediump float;\
    \
    varying vec2 uv;\
    \
    uniform sampler2D sampler;\
    \
    void main()\
    {\
        vec4 sample = texture2D(sampler, uv);\
        gl_FragColor = hx_linearToGamma(sample);\
    }";

HX.DrawNormalsShader = function()
{
    HX.Shader.call(this);

    this.init(HX.CopyTextureShader._vertexShader, HX.DrawNormalsShader._fragmentShader);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.DrawNormalsShader.prototype = Object.create(HX.Shader.prototype);

HX.DrawNormalsShader.prototype.execute = function(rect, texture)
{
    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};


HX.LinearizeDepthShader = function()
{
    HX.Shader.call(this);

    this.init(HX.LinearizeDepthShader._vertexShader, HX.LinearizeDepthShader.fragmentShader);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._rcpFrustumRangeLocation = HX.GL.getUniformLocation(this._program, "hx_rcpCameraFrustumRange");
    this._projectionLocation = HX.GL.getUniformLocation(this._program, "hx_projectionMatrix");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.LinearizeDepthShader.prototype = Object.create(HX.Shader.prototype);

HX.LinearizeDepthShader.prototype.execute = function(rect, texture, camera)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);
    HX.GL.uniform1f(this._rcpFrustumRangeLocation, 1.0/(camera.getNearDistance() - camera.getFarDistance()));
    HX.GL.uniformMatrix4fv(this._projectionLocation, false, camera.getProjectionMatrix()._m);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.LinearizeDepthShader._vertexShader = "\
    precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute vec2 hx_texCoord;\
    \
    varying vec2 uv;\
    \
    void main()\
    {\
        uv = hx_texCoord;\
        gl_Position = hx_position;\
    }";

HX.LinearizeDepthShader.fragmentShader = HX.GLSLIncludeGeneral + "\
        precision mediump float;\
        \
        varying vec2 uv;\
        \
        uniform sampler2D sampler;\
        uniform float hx_rcpCameraFrustumRange;\
        uniform mat4 hx_projectionMatrix;\
        \
        void main()\
        {\
            float depth = texture2D(sampler, uv).x;\
            float linear = hx_depthToViewZ(depth, hx_projectionMatrix) * hx_rcpCameraFrustumRange;\
            gl_FragColor = hx_floatToRGBA8(linear);\
        }";