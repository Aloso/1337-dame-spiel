function Init() {
    // Set the scene size.
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;

    // Set some camera attributes.
    const VIEW_ANGLE = 75;
    const ASPECT = WIDTH / HEIGHT;
    const NEAR = 0.1;
    const FAR = 10000;

    // Get the DOM element to attach to
    const container =
        document.querySelector('#container');

    // Create a WebGL renderer, camera
    // and a scene
    const renderer = new THREE.WebGLRenderer();
    const camera =
        new THREE.PerspectiveCamera(
            VIEW_ANGLE,
            ASPECT,
            NEAR,
            FAR
        );

    const scene = new THREE.Scene();

    // Add the camera to the scene.
    scene.add(camera);

    // Start the renderer.
    renderer.setSize(WIDTH, HEIGHT);

    // Attach the renderer-supplied
    // DOM element.
    container.appendChild(renderer.domElement);

    // create a point light
    const pointLight =
        new THREE.PointLight();

    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;

    // add to the scene
    scene.add(pointLight);


    var textLoader = new THREE.TextureLoader();
    var texture = textLoader.load( 'textures/bright_wood.jpg' );

    // immediately use the texture for material creation
    var material = new THREE.MeshPhongMaterial( { map: texture } );

    var loader = new THREE.STLLoader();
    loader.load('objects/Stein.stl', function (geometry) {
        ding = new THREE.Mesh(geometry, material);
        ding.position.x = 0;
        ding.position.y = 0;
        ding.position.z = -10;
        ding.rotation.y = 0;
        ding.rotation.z = 0;
        ding.scale.z = 4;
        ding.scale.x = 4;
        ding.scale.y = 4;
        scene.add(ding);
    });

    setInterval(function(){
        
        ding.rotation.x = 0.01 + ding.rotation.x;
        update();
    },100)


    scene.background = new THREE.Color(0xffffff);
    function update() {
        // Draw!
        renderer.render(scene, camera);

        // Schedule the next frame.
        requestAnimationFrame(update);
    }

    // Schedule the first frame.
    requestAnimationFrame(update);
}