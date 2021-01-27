import { isObject } from './../shared/index';
import { mutableHandlers } from './baseHandlers';


export const reactive = (target: object) => {
    console.log(target);
    // 你给我一个对象，我需要让这个对象变成响应式对象

    // 区别
    // 在vue2.0的时候，defineProperty直接循环对象中的每一个属性，无法对不存在的属性做处理，递归处理多级对象
    // vue3.0没有循环 对源对象进行代理，vue3不存在的属性也可以监测到, vue3没有一上来就递归


    return createReactiveObject(target, mutableHandlers); // 高阶函数，可以根据不同的参数实现不同的功能

}

const reactiveMap = new WeakMap(); // 映射表中的key必须是对象，而且不会有内存泄漏的问题
function createReactiveObject(target, baseHandler) {
    // 如果这个target是一个对象
    if(!isObject(target)) { // 不是对象直接返回即可
        return target
    }
    // 如果对象已经被代理过了，就不要再次代理了
    let existProxy = reactiveMap.get(target);
    if (existProxy) {
        return existProxy // 返回上一次的代理
    }
    const proxy = new Proxy(target, baseHandler); // reactive核心功能就是proxy
    reactiveMap.set(target, proxy) // (需要代理的对象，代理后的值)
    return proxy
}