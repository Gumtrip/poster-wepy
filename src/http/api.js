import wepy from 'wepy';


function errorMessage(data) {
    if(typeof data==='string'&&data){
        data = JSON.parse(data);
    }
    let validationErrors = data.errors;
    let messages = '';
    if (validationErrors &&typeof data==='object') {
        for (let item in validationErrors) {
            for (let i = 0; i < validationErrors[item].length; i++) {
                messages += validationErrors[item][i];
            }
        }
    } else {
        messages = data.message;
    }
    return messages;
}


// 服务器接口地址
const host = '__BASE_URL__';

// 普通请求
const request = async (options, showLoading = true,mustAuth=false) => {
    // 简化开发，如果传入字符串则转换成 对象
    if (typeof options === 'string') {
        options = {
            url: options
        }
    }

    // 获取Token
    let accessToken = await getToken();
    
    if(accessToken){
        options.header ={'Authorization': accessToken}
    }
//必须登陆但是没有token,跳转到登陆页
    if(!accessToken&&mustAuth){
        wepy.clearStorageSync()
        wepy.navigateTo({
            url:'/pages/auth/login'
        });
        return ;
    }

    // 显示加载中
    if (showLoading) {wepy.showLoading({title: '加载中'})}

    // 拼接请求地址
    options.url = host + '/' + options.url;
    // 调用小程序的 request 方法
    let response = await wepy.request(options);
    if (showLoading) {wepy.hideLoading()}


    const msg = errorMessage(response.data);
    switch (response.statusCode) {
        case 422:
            wepy.showModal({
                title: '验证失败！',
                content: msg
            });
            break;
        case 500:
            wepy.showModal({
                title: '提示',
                content: msg
            })
    }

    return response
};

// 登录
const login = async (params = {}) => {
    // code 只能使用一次，所以每次单独调用
    let loginData = await wepy.login()

    // 参数中增加code
    params.code = loginData.code
    // 接口请求 weapp/authorizations
    let authResponse = await request({
        url: 'auth/wx/authorization',
        data: params,
        method: 'POST'
    });

    // 登录成功，记录 token 信息
    if (authResponse.statusCode === 201) {
        const now = new Date().getTime();
        wepy.setStorageSync('token', authResponse.data.token)
        wepy.setStorageSync('token_expired_at', now + authResponse.data.expires_in * 1000)
        wepy.setStorageSync('token_expired_date', authResponse.data.expiresDate)
    }

    return authResponse
};


//  退出登录
const logout = async () => {
    // 调用删除 Token 接口，让 Token 失效
    let token = wepy.getStorageSync('token')
    let logoutResponse = await wepy.request({
        url: host + '/' +'auth/logout',
        method: 'DELETE',
        header: {
            'Authorization': token
        }
    });
    wepy.clearStorageSync()
    console.log('清空操作后:');

    return logoutResponse
}

const refreshToken = async (token) => {
    // 请求刷新接口
        let refreshResponse = await wepy.request({
            url:host + '/' +'auth/refreshToken',
            method: 'PUT',
            header: {
                'Authorization': token
            }
        });
        // 刷新成功状态码为 200
        if (refreshResponse.statusCode === 200) {
            // 将 Token 及过期时间保存在 storage 中
            const now = new Date().getTime();
            wepy.setStorageSync('token', refreshResponse.data.token)
            wepy.setStorageSync('token_expired_at', now + refreshResponse.data.expires_in * 1000)
            wepy.setStorageSync('token_expired_date', refreshResponse.data.expiresDate)
        }
        return refreshResponse
};

// 获取 Token
const getToken = async () => {
    // 从缓存中取出 Token
    let accessToken = wepy.getStorageSync('token')
    let expiredAt = wepy.getStorageSync('token_expired_at')
    // 如果 token 过期了，则调用刷新方法
    if (accessToken && new Date().getTime() > expiredAt) {
        let refreshResponse = await refreshToken(accessToken)
        // 刷新成功
        if (refreshResponse.statusCode === 200) {
            accessToken = refreshResponse.data.token
        } else {
            //刷新失败，
            accessToken='';
        }
    }

    return accessToken
};

// 带身份认证的请求
const authRequest = async (options,showLoading) => {
    options.authentication = true;
    return request(options,showLoading)
};

const uploadImages = async (options) => {
    // 显示loading
    wepy.showLoading({title: '上传中'});

    let accessToken = await getToken();
    // 获取 token
    // 拼接url
    options.url = host + '/uploadImages';
    let header = options.header || {};

    // 将 token 设置在 header 中
    header.Authorization = accessToken;
    options.header = header;

    // 上传文件
    let response = await wepy.uploadFile(options)
    // 隐藏 loading
    wepy.hideLoading();
    
    const msg = errorMessage(response.data);
    
    switch (response.statusCode) {
        case 422:
            wepy.showModal({
                title: '验证失败！',
                content: msg
            });break;
        case 500:
            wepy.showModal({
                title: '提示！',
                content: msg
            });break;
    }
    return response;
};


const verificationCodes = async (data) => {
    return await request({
        url: 'verificationCodes',
        method: 'POST',
        data:data
    },false)
};
const getCaptcha = async () => {
    return await request({
        url: 'getCaptcha',
        method: 'POST',
    },false);
};
const userMe = async ()=>{
    return await request({
        url:'user/me',
        method: 'post',
    },false,true)
};
const userUpdate = async (data)=>{
    
    return await request({
        url:'user/update',
        method: 'put',
        data:data
    },false)
};
const posters = async (data)=>{
    return await request({
        url:'posters',
        method: 'get',
        data:data
    },false)
};
const poster = async (id)=>{
    return await request({
        url:'posters/'+id,
        method: 'get',
    },false)
};

const posterCategories = async (data)=>{
    return await request({
        url:'posterCategories/',
        method: 'get',
        data:data
    },false)
};
const city = async (data)=>{
    return await request({
        url:'city',
        method: 'post',
        data:data
    },false)
};




export default {
    request,
    login,
    logout,
    verificationCodes,
    getCaptcha,
    userMe,
    userUpdate,
    uploadImages,
    posters,
    poster,
    posterCategories,
    city,
}
