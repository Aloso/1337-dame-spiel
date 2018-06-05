function Test1 (a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
}
Test1.prototype.d = function() {return 2 * this.a};
Test1.prototype.e = function() {return 3 * this.b};
Test1.prototype.f = function() {return 4 * this.c};


function Test2(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = function() {return 2 * this.a};
    this.e = function() {return 3 * this.b};
    this.f = function() {return 4 * this.c};
}

function test3(a, b, c) {
    return {
        a: a,
        b: b,
        c: c,
        d: function() {return 2 * this.a},
        e: function() {return 3 * this.b},
        f: function() {return 4 * this.c}
    }
}