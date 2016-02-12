var outputBox;
var NUM_ITERATIONS = 10000;
var arrA, arrB, arrC, arrD;

window.onload = function()
{
    outputBox = document.getElementById("testOutput");
};

function runBenchmark()
{
    arrA = [];
    benchmark("arr = [], push", runCaseA);

    arrB = [];
    benchmark("arr.length = 0, push", runCaseB);

    arrC = [];
    benchmark("arr = [], i++", runCaseC);

    arrD = [];
    benchmark("arr.length = 0, i++", runCaseD);
}

function benchmark(name, fnc)
{
    var startTime = new Date().getTime();
    output("Starting " + name);
    for (var i = 0; i < NUM_ITERATIONS; ++i) {
        fnc();
    }
    output("Completed " + name + " : <strong>" + (new Date().getTime() - startTime) + "ms</strong><br/>");
}

function runCaseA()
{
    arrA = [];
    for (var i = 0; i < 10000; ++i) {
        arrA.push(new HX.RenderItem());
    }
}

function runCaseB()
{
    arrB.length = 0;
    for (var i = 0; i < 10000; ++i) {
        arrB.push(new HX.RenderItem());
    }
}

function runCaseC()
{
    arrC.length = 0;
    for (var i = 0; i < 10000; ++i) {
        arrC[i] = new HX.RenderItem();
    }
}

function runCaseD()
{
    arrD.length = 0;
    for (var i = 0; i < 10000; ++i) {
        arrD[i] = new HX.RenderItem();
    }
}

function output(message)
{
    outputBox.innerHTML = outputBox.innerHTML + message + "<br/>";
}