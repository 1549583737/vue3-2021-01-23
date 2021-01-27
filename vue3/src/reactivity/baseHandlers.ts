import { reactive } from './reactive';
import { isObject, hasOwn, isArray, hasChange } from './../shared/index';
import {activeEffect, effectStack, track, trigger} from './effect';


// proxy 和 reflect 连用  (reflect 以后会取代掉 object上一系列方法)
// Reflect

export const mutableHandlers = {
    // 目标源对象 属性 代理后的对象
    get(target, key, receiver) { // 内置的 proxy中get和set参数是固定的
        // console.log('get 方法执行')
        let res = Reflect.get(target, key, receiver);
        // console.log('activeEffect: ', activeEffect.id)
        // console.log('key: ', key)
        if (typeof key == 'symbol') { // 如果是内置的symbol 就排除掉依赖收集
            return res;
        }
        track(target, key) // 属性 和 effect之间做一个关联
        return isObject(res) ? reactive(res) : res; // target[key]
    }, // 当取值的时候，应该将effect 存储起来
    set(target, key, value, receiver) {
        // console.log('set 方法执行')
        // console.log('代理对象receiver: ', receiver)
        // console.log('源对象target: ', target)
        // target[key] = value;
        console.log(key)
        const oldValue = target[key] // 上一次的结果

        // 对象，数组
        // 如果是数组并且操作的是索引 就比较当前新增的属性 是否比长度大，大的话就是以前没有新增的
        const hadKey = isArray(target) && (parseInt(key, 10) == key ) ? Number(key) < target.length : hasOwn(target, key);
        let result = Reflect.set(target, key, value, receiver);
        // 调用push方法 会先进行添加属性 再去更新长度 （这次长度更新时没有意义的）
        if(!hadKey) {
            console.log('增加属性')
            trigger(target, 'add', key, value) // 触发新增操作
        } else if(hasChange(oldValue, value)) {
            console.log('修改属性')
            trigger(target, 'set', key, value)
        }

        console.warn(hadKey);
        

        // 设置一般分为两种一种是添加新的属性，还有种是修改属性

        // effectStack.forEach(effect => effect)
        return result;
    } // 当设置值的时候 应该通知对应的effect来更新
}

// 默认加载页面时，会先调用一次effect,此时effect方法中的数据会进行取值操作-》get方法
// 让对应的属性保存当前的effect =》 对象中name属性 对应的effect有几个
// 某个对象中 name属性变化了， 需要找到对应的effect列表让他依次执行