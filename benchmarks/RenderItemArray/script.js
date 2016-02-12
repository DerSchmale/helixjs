var outputBox;
var NUM_ITERATIONS = 10000;
var NUM_ITEMS = 10000;
var arrA, arrB, arrC, arrD;
var linkedListHead = null;
var renderItemHead = null;

var LinkedListNode = function()
{
    this.renderItem = null;
    this.next = null;
};

LinkedListNode.prototype = {};

window.onload = function()
{
    outputBox = document.getElementById("testOutput");
    initItems();
};

function initItems()
{
    var linkedListItem = linkedListHead = new LinkedListNode();
    var renderItem = renderItemHead = new HX.RenderItem();
    for (var i = 0; i < NUM_ITEMS - 1; ++i) {
        linkedListItem.next = new LinkedListNode();
        linkedListItem = linkedListItem.next;

        renderItem.next = new HX.RenderItem();
        renderItem = renderItem.next;
    }
}

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

    benchmark("Pooled linked list", runCaseE);
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
    var renderItem = renderItemHead;
    arrA = [];
    for (var i = 0; i < NUM_ITEMS; ++i) {
        arrA.push(renderItem);
        renderItem = renderItem.next;
    }
}

function runCaseB()
{
    var renderItem = renderItemHead;
    arrB.length = 0;
    for (var i = 0; i < NUM_ITEMS; ++i) {
        arrB.push(renderItem);
        renderItem = renderItem.next;
    }
}

function runCaseC()
{
    var renderItem = renderItemHead;
    arrC = [];
    for (var i = 0; i < NUM_ITEMS; ++i) {
        arrC[i] = renderItem;
        renderItem = renderItem.next;
    }
}

function runCaseD()
{
    var renderItem = renderItemHead;
    arrD.length = 0;
    for (var i = 0; i < NUM_ITEMS; ++i) {
        arrD[i] = renderItem;
        renderItem = renderItem.next;
    }
}

function runCaseE()
{
    var renderItem = renderItemHead;
    var node = linkedListHead;
    for (var i = 0; i < NUM_ITEMS; ++i) {
        node.renderItem = renderItem;
        node = node.next;
        renderItem = renderItem.next;
    }
}

function output(message)
{
    outputBox.innerHTML = outputBox.innerHTML + message + "<br/>";
}