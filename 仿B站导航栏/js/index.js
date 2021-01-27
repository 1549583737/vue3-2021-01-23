function getOffset(ele) {
    let offsetTop = ele.offsetTop,
        parent = ele.offsetParent;
    while (parent) {
        offsetTop += parent.offsetTop;
        parent = parent.offsetParent;
    }
    return offsetTop;
}
window.onload = function () {

    let mapList = [{
        id: 'guochuang',
        text: '国创',
        top: 0,
        active: false
    }, {
        id: 'yinyue',
        text: '音乐',
        top: 0,
        active: false
    }, {
        id: 'fanju',
        text: '番剧',
        top: 0,
        active: false
    }, {
        id: 'manhua',
        text: '漫画',
        top: 0,
        active: false
    }, {
        id: 'wudao',
        text: '舞蹈',
        top: 0,
        active: false
    }, {
        id: 'donghua',
        text: '动画',
        top: 0,
        active: false
    }, {
        id: 'zixun',
        text: '资讯',
        top: 0,
        active: false
    }];
    let navigation = document.querySelector('.navigation'),
        navigationModal = document.querySelector('.navigation-modal'),
        markBox = document.querySelector('.mark-box'),
        listBox = document.querySelector('.list-box'),
        list = navigation.querySelector('.list'),
        isEdit = false;
    // 计算元素到页面顶部的距离
    function computedTop() {
        mapList.forEach(item => {
            let ele = document.getElementById(item.id);
            item.top = getOffset(ele);
        })
        console.log(mapList)
    }
    computedTop();
    // 把mapList渲染到页面上
    function renderList() {
        list.innerHTML = mapList.map(item =>
            `<li class="${item.active ? 'active' : ''}" data-id="${item.id}">${item.text}</li>`
        ).join('');
    }
    renderList();
    window.onscroll = function () {
        // 页面滚动的高度
        initPosition();
        changeActive();
    }
    function initPosition () {
        let scrollTop = document.documentElement.scrollTop;
        if (scrollTop > 300) {
            navigation.style.position = 'fixed';
            navigation.style.top = '50px';
        } else {
            navigation.style.position = 'absolute';
            navigation.style.top = '250px';
        }

    }
    initPosition();
    // 页面滚动到某板块时，导航响应板块变为活动态
    function changeActive() {
        let scrollTop = document.documentElement.scrollTop;
        if (scrollTop > mapList[mapList.length - 1].top) {
            mapList[mapList.length - 1].active = true;
        } else {
            mapList.forEach((item, i) => {
                item.active = false;
                if (item.top < scrollTop && mapList[i + 1].top > scrollTop) {
                    console.log(i, scrollTop);
                    item.active = true;
                }
            })
        }
        renderList();
    }
    
    // 事件委托
    listBox.onclick = function (e) {
        let target = e.target;
        // console.log(e)
        if (target.tagName === 'LI') {
            let id = target.getAttribute('data-id');
            document.documentElement.scrollTop = mapList.find(item => item.id === id).top;
        }
        if (target.tagName === 'I') {
            target = target.parentNode;// I标签变成A标签
        }
        // 回到顶部
        if (target.tagName === 'A' && target.classList.contains("top-btn")) {
            document.documentElement.scrollTop = 0;
        }
        // 编辑态按钮
        if (target.tagName === 'A' && target.classList.contains("sort-btn")) {
            if (isEdit) {
                // 退出
                isEdit = false;
                target.classList.remove('active');
                navigationModal.style.display = 'none';
                markBox.style.display = 'none';
                changeActive();
                return;
            }
            isEdit = true;
            target.classList.add('active');
            navigationModal.style.display = 'block';
            markBox.style.display = 'block';
            mapList.forEach(item => {
                item.active = false;
            })
            renderList();
        }
    }
    // 0级事件  再次使用onclick 是覆盖前面的事件
    // 2级事件  可以一直增加 不会覆盖
    function click() {
        if (isEdit) {
            // 退出
            isEdit = false;
            let sortBtn = document.querySelector('.sort-btn');
            sortBtn.classList.remove('active');
            navigationModal.style.display = 'none';
            markBox.style.display = 'none';
            changeActive();
            return;
        }

    }
    navigationModal.addEventListener('click', click);
    // navigationModal.removeEventListener('click', click);
    let domList;
    list.onmousedown = function (e) {
        if (!isEdit) return;
        console.log(e);
        let target = e.target;
        domList = [...list.getElementsByTagName('li')];
        domList.forEach((dom, i) => {
            dom.style.position = 'absolute';
            dom.style.top = `${i * 28}px`;
            dom.classList.remove('active');
            dom.index = i;
        })
        target.classList.add('active');
        target.startTop = parseFloat(target.style.top);
        console.error(target.startTop)
        target.startY = e.pageY;
        target.oldY = e.pageY;
        // bind返回的是改变this之后的函数体
        // call改变this 并且立即执行 返回的是moving执行之后的返回值
        // 绑定在document上面，防止鼠标丢失   为什么不绑定在li上？
        document.onmousemove = moving.bind(target);
        document.onmouseup = moveEnd.bind(target);
    }
    function moving(e) {
        let min = 0,
            max = (domList.length - 1) * 28,
            curTop = this.startTop + (e.pageY - this.startY);
        curTop = curTop > min ? (curTop > max ? max : curTop) : min;
        // console.log(curTop);
        this.style.top = curTop + 'px';
        let n = Math.round(curTop / 28); // 滑到超过一半才互换位置
        this.old_index = this.index; //初始位置 1
        this.index = n;// 移动后的位置 4

        if (this.oldY < e.pageY) {
            //下移
            domList.forEach(dom => {
                if (dom.index >= this.old_index && dom.index <= this.index &&
                    this.getAttribute('data-id') !== dom.getAttribute('data-id')) {
                    dom.index--;
                    dom.style.top = `${dom.index * 28}px`;
                }
            })
        } else {
            // 上移
            domList.forEach(dom => {
                if (dom.index >= this.index && dom.index <= this.old_index &&
                    this.getAttribute('data-id') !== dom.getAttribute('data-id')) {
                    dom.index++;
                    dom.style.top = `${dom.index * 28}px`;
                }
            })
        }
        // startY只是初始位置
        // oldY记录的是移动轨迹，就是从哪来的
        this.oldY = e.pageY;
    }
    function moveEnd(e) {
        this.classList.remove('active');
        let arr = [];
        domList.forEach(dom => {
            arr[dom.index] = mapList.find(item => item.id === dom.getAttribute('data-id'))
        })
        console.log(arr)
        mapList = arr;
        renderList();
        // 页面的板块排序
        renderDom();
        // 重新计算top值
        computedTop();
        document.onmousemove = null;
        document.onmouseup = null;
    }
    function renderDom() {
        let frag = document.createDocumentFragment();
        mapList.forEach(item => {
            let ele = document.getElementById(item.id);
            frag.appendChild(ele);
        })
        document.querySelector('.container').appendChild(frag);
    }
}