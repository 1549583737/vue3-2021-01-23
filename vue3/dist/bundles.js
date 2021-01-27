(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VueReactivity = {}));
}(this, (function (exports) { 'use strict';

    var isObject = function (val) { return typeof val == 'object' && val !== null; };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasOwn = function (target, key) { return hasOwnProperty.call(target, key); };
    var isArray = function (target) { return Array.isArray(target); };
    var hasChange = function (oldVal, newVal) { return oldVal !== newVal; };

    // import { effectStack } from './effect';
    // import { effect } from './effect';
    var effect = function (fn, options) {
        // 需要让传递来的fn变成响应式的effect，数据一变化 这个fn就能重新执行
        var effect = createReactiveEffect(fn); // fn用户传递的函数
        effect();
    };
    // effect 应该和数据关联起来
    // 组件就是一个多级别的effect
    // effect1(()=>{
    //     state.name
    //     effect2(() => {
    //         state.age
    //     })
    //     state.address
    // })
    // 默认先调用effect1 内部对state.name取值，把name属性和activeEffect(effect1) 关联起来
    // 调用effect2 内部对state.age 取值，把age和activeEffect(effect2) 关联起来
    // effect2 执行完毕 activeEffect 指向effect1
    // state.address 再次取值 此时关联到了 effect1
    var effectStack = []; // 这个栈为了保证当前effect 和属性能对应上
    var activeEffect = null;
    var id = 0;
    function createReactiveEffect(fn) {
        var effect = function reactiveEffect() {
            // effect(()=>{ state.name++}) 防止死循环
            if (!effectStack.includes(effect)) {
                try {
                    effectStack.push(effect);
                    activeEffect = effect;
                    return fn(); // 让函数执行 会执行取值逻辑, 在取值逻辑中可以和effect做关联
                }
                finally {
                    effectStack.pop();
                    activeEffect = effectStack[effectStack.length - 1];
                }
            }
        };
        effect.id = id++;
        return effect;
    }
    // 某个对象中的 某个属性 依赖了 哪些effect
    // {{}: name: [effect]} // weakMap set
    // {{}: age: [effect]} // weakMap set
    var targetMap = new WeakMap;
    // let obj = {}
    // let map = new Map();  let map = new WeakMap;
    // map.set(obj, 1)
    // obj = null; 引用标记 不会被销毁
    // 建立属性和effect之间的关联
    function track(target, key) {
        if (activeEffect == undefined) {
            return;
        }
        var depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map())); // weakMap 为了解决内存泄漏
        }
        var dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = new Set()));
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
        }
    }
    var run = function (effects) {
        if (effects) {
            effects.forEach(function (effect) {
                effect();
            });
        }
    };
    function trigger(target, type, key, value) {
        var depsMap = targetMap.get(target);
        if (!depsMap) {
            return;
        }
        // 修改
        if (key == 'length' && isArray(target)) {
            depsMap.forEach(function (dep, key) {
                // 如果改变了 数组长度 那么一定是更新
                // 这里是2 收集的 key = 2 value = 1 state.arr[2] state.arr.length = 1
                // key => {map中的key} => {name: set: []}
                // 如果你修改的是长度 正好内部也对长度进行了收集 长度也要触发
                if (key == 'length' || key >= value) {
                    run(dep);
                }
            });
            // return;
        }
        else {
            if (key !== undefined) { // 如果有收集过就触发
                var effects = depsMap.get(key);
                run(effects);
            }
            switch (type) {
                case 'add': // 添加属性 需要触发length
                    if (isArray(target)) {
                        if (parseInt(key) == key) {
                            run(depsMap.get('length')); // 打补丁， 不更新就手动触发
                        }
                    }
                    break;
            }
        }
    }

    // proxy 和 reflect 连用  (reflect 以后会取代掉 object上一系列方法)
    // Reflect
    var mutableHandlers = {
        // 目标源对象 属性 代理后的对象
        get: function (target, key, receiver) {
            // console.log('get 方法执行')
            var res = Reflect.get(target, key, receiver);
            // console.log('activeEffect: ', activeEffect.id)
            // console.log('key: ', key)
            if (typeof key == 'symbol') { // 如果是内置的symbol 就排除掉依赖收集
                return res;
            }
            track(target, key); // 属性 和 effect之间做一个关联
            return isObject(res) ? reactive(res) : res; // target[key]
        },
        set: function (target, key, value, receiver) {
            // console.log('set 方法执行')
            // console.log('代理对象receiver: ', receiver)
            // console.log('源对象target: ', target)
            // target[key] = value;
            console.log(key);
            var oldValue = target[key]; // 上一次的结果
            // 对象，数组
            // 如果是数组并且操作的是索引 就比较当前新增的属性 是否比长度大，大的话就是以前没有新增的
            var hadKey = isArray(target) && (parseInt(key, 10) == key) ? Number(key) < target.length : hasOwn(target, key);
            var result = Reflect.set(target, key, value, receiver);
            // 调用push方法 会先进行添加属性 再去更新长度 （这次长度更新时没有意义的）
            if (!hadKey) {
                console.log('增加属性');
                trigger(target, 'add', key, value); // 触发新增操作
            }
            else if (hasChange(oldValue, value)) {
                console.log('修改属性');
                trigger(target, 'set', key, value);
            }
            console.warn(hadKey);
            // 设置一般分为两种一种是添加新的属性，还有种是修改属性
            // effectStack.forEach(effect => effect)
            return result;
        } // 当设置值的时候 应该通知对应的effect来更新
    };
    // 默认加载页面时，会先调用一次effect,此时effect方法中的数据会进行取值操作-》get方法
    // 让对应的属性保存当前的effect =》 对象中name属性 对应的effect有几个
    // 某个对象中 name属性变化了， 需要找到对应的effect列表让他依次执行

    var reactive = function (target) {
        console.log(target);
        // 你给我一个对象，我需要让这个对象变成响应式对象
        // 区别
        // 在vue2.0的时候，defineProperty直接循环对象中的每一个属性，无法对不存在的属性做处理，递归处理多级对象
        // vue3.0没有循环 对源对象进行代理，vue3不存在的属性也可以监测到, vue3没有一上来就递归
        return createReactiveObject(target, mutableHandlers); // 高阶函数，可以根据不同的参数实现不同的功能
    };
    var reactiveMap = new WeakMap(); // 映射表中的key必须是对象，而且不会有内存泄漏的问题
    function createReactiveObject(target, baseHandler) {
        // 如果这个target是一个对象
        if (!isObject(target)) { // 不是对象直接返回即可
            return target;
        }
        // 如果对象已经被代理过了，就不要再次代理了
        var existProxy = reactiveMap.get(target);
        if (existProxy) {
            return existProxy; // 返回上一次的代理
        }
        var proxy = new Proxy(target, baseHandler); // reactive核心功能就是proxy
        reactiveMap.set(target, proxy); // (需要代理的对象，代理后的值)
        return proxy;
    }

    exports.effect = effect;
    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bundles.js.map
