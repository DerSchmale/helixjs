/**
 *
 * @classdesc
 * ObjectPool allows pooling reusable objects. All it needs is a "next" property to keep it in the list.
 *
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function ObjectPool(type)
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
            item = new type();
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