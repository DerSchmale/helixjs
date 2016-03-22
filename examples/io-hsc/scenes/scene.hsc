{
    "version": "0.1",

    "objects":[
        {
            "id": 0,
            "name": "scene",
            "type": "scene"
        },

        {
            "id": 1,
            "name": "floor-mesh",
            "type": "mesh",

            "numVertices": 8,
            "vertexData": {
                "hx_position": [ -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0 ],
                "hx_normal": [ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0 ],
                "hx_texCoord": [ 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0 ]
            },
            "indexData": [ 0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6 ]
        },

        {
            "id": 2,
            "name": "floor-model",
            "type": "model",

           "properies": {
           }
        },

        {
            "id": 3,
            "name": "floor-instance",
            "type": "modelinstance",

            "position": [ 0.0, 0.0, 0.0 ]
        },

        {
            "id": 4,
            "name": "floor-material",
            "type": "material"
        },

         {
             "id": 5,
             "name": "dir-light",
             "type": "dirlight",

             "direction": [1.0, -1.0, 1.0]
         },

         {
             "id": 6,
             "name": "amb-light",
             "type": "amblight",

             "color": [0.1, 0.1, 0.1]
         }
    ],

    "connections": [
        { "c": 1, "p": 2 },
        { "c": 2, "p": 3 },
        { "c": 4, "p": 3 },
        { "c": 3, "p": 0 },
        { "c": 5, "p": 0 },
        { "c": 6, "p": 0 }
    ]
}