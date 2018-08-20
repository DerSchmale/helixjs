// Fix iOS Audio Context by Blake Kus https://gist.github.com/kus/3f01d60569eeadefe3a1
// MIT license
(function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (window.AudioContext) {
        window.hx_audioContext = new window.AudioContext();
    }
    else return;
    var fixAudioContext = function (e) {
        if (window.hx_audioContext) {
            // Create empty buffer
            var buffer = window.hx_audioContext.createBuffer(1, 1, 22050);
            var source = window.hx_audioContext.createBufferSource();
            source.buffer = buffer;
            // Connect to output (speakers)
            source.connect(window.hx_audioContext.destination);
            // Play sound
            if (source.start) {
                source.start(0);
            } else if (source.play) {
                source.play(0);
            } else if (source.noteOn) {
                source.noteOn(0);
            }
        }
        // Remove events
        document.removeEventListener('touchstart', fixAudioContext);
        document.removeEventListener('touchend', fixAudioContext);
    };
    // iOS 6-8
    document.addEventListener('touchstart', fixAudioContext);
    // iOS 9
    document.addEventListener('touchend', fixAudioContext);
})();