import {RenderItem} from "./RenderItem";

export function RenderItemPool()
{
    var head = null;
    var pool = null;

    this.getItem = function()
    {
        var item;

        if (head) {
            item = head;
            head = head.next;
        }
        else {
            item = new RenderItem();
            item.next = pool;
            pool = item;
        }

        return item;
    };

    this.reset = function()
    {
        head = pool;
    };
}