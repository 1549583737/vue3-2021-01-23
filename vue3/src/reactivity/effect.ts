// import { effectStack } from './effect';

import { isArray } from "../shared";

// import { effect } from './effect';
export const effect = (fn, options = {}) => {
    // 需要让传递来的fn变成响应式的effect，数据一变化 这个fn就能重新执行
    const effect = createReactiveEffect(fn); // fn用户传递的函数
    effect();
}

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



export let effectStack = [];  // 这个栈为了保证当前effect 和属性能对应上
export let activeEffect = null;
let id = 0;
function createReactiveEffect(fn) {
    const effect = function reactiveEffect() {
        // effect(()=>{ state.name++}) 防止死循环
        if (!effectStack.includes(effect)) { 
            try {
                effectStack.push(effect);
                activeEffect = effect;
                return fn(); // 让函数执行 会执行取值逻辑, 在取值逻辑中可以和effect做关联
            } finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1]
            }
        } 
    }
    effect.id = id++;
    return effect;
}

// 某个对象中的 某个属性 依赖了 哪些effect
// {{}: name: [effect]} // weakMap set
// {{}: age: [effect]} // weakMap set
const targetMap = new WeakMap;

// let obj = {}
// let map = new Map();  let map = new WeakMap;
// map.set(obj, 1)
// obj = null; 引用标记 不会被销毁

// 建立属性和effect之间的关联
export function track(target, key) {
    if (activeEffect == undefined) {
        return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map())) // weakMap 为了解决内存泄漏
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}

const run = (effects) => {
    if (effects) {
        effects.forEach(effect => {
            effect();
        });
    }
}
export function trigger(target, type, key, value) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }

    // 修改
    if(key == 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => { // 只要改了length就触发
            // 如果改变了 数组长度 那么一定是更新

            // 这里是2 收集的 key = 2 value = 1 state.arr[2] state.arr.length = 1


            // key => {map中的key} => {name: set: []}
            // 如果你修改的是长度 正好内部也对长度进行了收集 长度也要触发
            if (key == 'length' || key >= value) {  
                run(dep)
            }
        });
        // return;
    } else {
        if (key !== undefined) { // 如果有收集过就触发
            let effects = depsMap.get(key)
            run(effects)
        }
    
        switch(type) {
            case 'add':  // 添加属性 需要触发length
                if(isArray(target)) {
                    if (parseInt(key) == key) {
                        run(depsMap.get('length')) // 打补丁， 不更新就手动触发
                    }
                }
                break;
            default: break;    
        }
    }
}