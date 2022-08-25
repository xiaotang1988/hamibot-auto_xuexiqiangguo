/**
 * 检查和设置运行环境
 * @return {int} 静音前的音量
 */
function check_set_env() {
    // 检查无障碍服务是否已经启用
    auto.waitFor();

    // 检查Hamibot版本是否支持ocr
    if (app.versionName < "1.3.1") {
        toast("请将Hamibot更新至v1.3.1版本或更高版本");
        exit();
    }

    // 保持屏幕唤醒状态
    device.keepScreenDim();

    //请求横屏截图权限
    threads.start(function () {
        try {
            var beginBtn;
            if ((beginBtn = classNameContains("Button").textContains("开始").findOne(delay_time)));
            else beginBtn = classNameContains("Button").textContains("允许").findOne(delay_time);
            beginBtn.click();
        } catch (error) {
        }
    });
    requestScreenCapture(false);

    // 获得原来的媒体音量
    var vol = device.getMusicVolume();

    return vol;
}

/**
 * 获取配置参数及本地存储数据
 */
// 基础数据
var { delay_time } = hamibot.env;
delay_time = Number(delay_time) * 1000;
var { four_player_battle } = hamibot.env;
var { two_player_battle } = hamibot.env;

//程序运行情况检测
var vol = check_set_env();

//初始化屏幕参数
var [device_w, device_h] = init_wh();

/**
 * 模拟点击可点击元素
 * @param {string} target 控件文本
 */
function my_click_clickable(target) {
    text(target).waitFor();
    // 防止点到页面中其他有包含“我的”的控件，比如搜索栏
    if (target == "我的") {
        id("comm_head_xuexi_mine").findOne().click();
    } else {
        click(target);
    }
}

/**
 * 模拟随机时间
 * @param {int} time 时间
 * @return {int} 随机后的时间值
 */
function random_time(time) {
    return time + random(100, 1000);
}

/**
 * 点击对应的去答题
 * @param {int} number 10和11分别为四人赛双人对战
 */
function entry_model(number) {
    sleep(random_time(delay_time * 2));
    var model = className("android.view.View").depth(22).findOnce(number);
    while (!model.child(3).click());
}

// 下载题库
const update_info = get_tiku_by_http("https://gitcode.net/m0_64980826/songge_tiku/-/raw/master/info.json");
var tiku = [];
try {tiku = get_tiku_by_http(update_info["tiku_link"]);}
catch (e) {}
sleep(random_time(delay_time));

/**
 * 如果因为某种不知道的bug退出了界面，则使其回到正轨
 */
function back_track() {
    app.launchApp("学习强国");
    sleep(random_time(delay_time * 3));
    var while_count = 0;
    while (!id("comm_head_title").exists() && while_count < 5) {
        while_count++;
        back();
        sleep(random_time(delay_time));
    }
    my_click_clickable("我的");
    sleep(random_time(delay_time));
    my_click_clickable("学习积分");
    sleep(random_time(delay_time));
    text("登录").waitFor();
}

/*
********************四人赛、双人对战********************
 */

/**
 * 处理访问异常
 */
function handling_access_exceptions() {
    // 在子线程执行的定时器，如果不用子线程，则无法获取弹出页面的控件
    var thread_handling_access_exceptions = threads.start(function() {
        while (true) {
            textContains("访问异常").waitFor();
            // 滑动按钮“>>”位置
            idContains("nc_1_n1t").waitFor();
            var bound = idContains("nc_1_n1t").findOne().bounds();
            // 滑动边框位置
            text("向右滑动验证").waitFor();
            var slider_bound = text("向右滑动验证").findOne().bounds();
            // 通过更复杂的手势验证（向右滑动过程中途停顿）
            var x_start = bound.centerX();
            var dx = x_start - slider_bound.left;
            var x_end = slider_bound.right - dx;
            var x_mid = (x_end - x_start) * random(5, 9) / 10 + x_start;
            var y_start = random(bound.top, bound.bottom);
            var y_end = random(bound.top, bound.bottom);
            x_start = random(x_start - 7, x_start);
            x_end = random(x_end, x_end + 10);
            gesture(random(delay_time, delay_time + 50), [x_start, y_start], [x_mid, y_end], [x_end, y_end]);
            sleep(delay_time / 2);
            if (textContains("刷新").exists()) {
                click("刷新");
                continue;
            }
            if (textContains("网络开小差").exists()) {
                click("确定");
                continue;
            }
            // 执行脚本只需通过一次验证即可，防止占用资源
            break;
        }
    });
    return thread_handling_access_exceptions;
}

/* 
处理访问异常，滑动验证
*/
var thread_handling_access_exceptions = handling_access_exceptions();

/**
 * 答题
 */
function do_contest(renshu) {
    if (renshu == 4) {
        // 点击进入四人赛
        sleep(random_time(delay_time));
        my_click_clickable("开始比赛");
    }
    else if (renshu == 2) {
        // 点击进入双人对战
        text("随机匹配").waitFor();
        sleep(random_time(delay_time * 2));
        try {
            className("android.view.View").clickable(true).depth(24).findOnce(1).click();
        } catch (error) {
        className("android.view.View").text("").findOne().click();
        }
    }
    while (!text("开始").exists());
    className("android.widget.ListView").waitFor();
    let num = 1;
    let err_flag = true;
    while (true) {
        // 如果是第一题或者下面出错，则跳过前面等待过渡
        if (num != 1 && err_flag) {
            // 检查到其中一个过渡界面为止
            while (true) {
                // 检测是否结束并退出
                if (text("继续挑战").exists()) {
                    sleep(1000);
                    my_click_clickable("继续挑战");
                    sleep(1500);
                    if (num_2 == 1) back();
                    if (renshu == 2) {
                        back();
                        sleep(1000);
                        my_click_clickable("退出");
                    }
                    sleep(1000);
                    if (num_2 == 0) text("开始比赛").waitFor();
                    if (num_2 == 1 || renshu == 2) text("登录").waitFor();
                    sleep(random_time(delay_time));
                    return true;
                }
                else if (text("第" + num + "题").exists()) {
                    break;
                }
            }
            // 直到过渡界面消失，再匹配下一题
            while (text("第" + num + "题").exists()) {}
        }
        else if (!err_flag) {
            err_flag = true;
            if (text("继续挑战").exists()) {
                sleep(1000);
                my_click_clickable("继续挑战");
                sleep(1500);
                if (num_2 == 1) back();
                if (renshu == 2) {
                    back();
                    sleep(1000);
                    my_click_clickable("退出");
                }
                sleep(1000);
                if (num_2 == 0) text("开始比赛").waitFor();
                if (num_2 == 1 || renshu == 2) text("登录").waitFor();
                sleep(random_time(delay_time));
                return true;
            }
        }
        let listview = className("android.widget.ListView").findOne(1000);
        if (!listview) {
            err_flag = false;
            sleep(200);
            continue;
        }
        sleep(100); // 追求极限速度，不知道会不会出错
        let view_d28 = className("android.view.View").depth(28).indexInParent(0).findOne(1000);
        if (!view_d28) {
            err_flag = false;
            sleep(200);
            continue;
        }
        // 根据父框的孩子数
        if (view_d28.childCount() > 0) {
            que_x = view_d28.bounds().left;
            que_y = view_d28.bounds().top;
            que_w = view_d28.bounds().width();
            if (view_d28.child(0).text().length <= 4) { //有来源的是前面两个空格元素，文本为4个空格
                que_h = view_d28.child(2).bounds().top - view_d28.bounds().top;
            } else { //无来源的是题目，文本为8个空格
                que_h = view_d28.child(0).bounds().bottom - view_d28.bounds().top;
            }
        }
        else {
            err_flag = false;
            sleep(200);
            continue;
        }
        // 查找选项个数
        var radio_num = className("android.widget.RadioButton").find().length;
        if (!radio_num) {
            err_flag = false;
            sleep(200);
            continue;
        }
        for (let i = 0; i < 3; i++) {
            let img = captureScreen();
            // 裁剪题干区域，识别题干
            let que_img = images.clip(img, que_x, que_y, que_w, que_h);
            let results = ocr.recognize(que_img).results;
            var que_txt = ocr_rslt_to_txt(results).replace(/[^\u4e00-\u9fa5\d]|^\d{1,2}\.?/g, "");
            if (!que_txt) {
                img.recycle();
                que_img.recycle();
            } else {
                img.recycle();
                que_img.recycle();
                break
            }
        }
        // 选项清洗标识
        var replace_sign = "default_ocr_replace";
        let question_reg = new RegExp(update_info["question_reg"], "gi");
        let include_reg = new RegExp(update_info["include_reg"], "gi");
        var que_key = null;
        if (que_key = question_reg.exec(que_txt)) { replace_sign = "other_ocr_replace"; }
        else if (que_key = (/读音|词形/g).exec(que_txt)) { replace_sign = "accent_ocr_replace"; }
        else if (que_key = include_reg.exec(que_txt)) { replace_sign = "include_ocr_replace"; }
        
        let ans_list = get_ans_by_tiku(que_txt);
        let idx_dict = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5};
        
        // 如果上面答案不唯一或者不包含找到的选项，直到选项完全出现在屏幕
        try {
            while (className("android.widget.ListView").findOne(1000).indexInParent() == 0) {}
        } catch (e) {
            err_flag = false;
            sleep(200);
            continue;
        }
        let xuanxiang_list = className("android.widget.ListView").findOne(1000);
        let xuanxiang_index = xuanxiang_list.indexInParent();
        let xuanxiang_list_x = xuanxiang_list.bounds().left;
        let xuanxiang_list_y = xuanxiang_list.bounds().top;
        let xuanxiang_list_w = xuanxiang_list.bounds().width();
        let xuanxiang_list_h = xuanxiang_list.bounds().height();
        
        if (!xuanxiang_list || !xuanxiang_list.parent().childCount() || !xuanxiang_list.parent().child(0)) {
            err_flag = false;
            sleep(200);
            continue;
        }
        img = captureScreen();
        // 裁剪所有选项区域
        img = images.clip(img, xuanxiang_list_x, xuanxiang_list_y, xuanxiang_list_w, xuanxiang_list_h);
        let xuan_txt_list = [];
        let allx_txt = "";
        // 重新排序识别结果
        let x_results = ocr.recognize(img).results;
        allx_txt = ocr_rslt_to_txt(x_results).replace(/\s+/g, "");
        // 原识别结果
        if (!allx_txt) {
            err_flag = false;
            sleep(200);
            continue;
        }
        img.recycle();
        // 清洗选项文本
        let replace_d = update_info[replace_sign];
        if (replace_sign == "include_ocr_replace") {
            let result = true;
            let [words, r, repl] = replace_d[que_key];
            for (let word of words) {
                let reg = new RegExp(word, "gi");
                if (!reg.test(allx_txt)) {
                    result = false;
                    break;
                }
            }
            if (result) {
                let reg = new RegExp(r, "gi");
                allx_txt = allx_txt.replace(reg, repl);
            }
        } else {
            for (let r of Object.keys(replace_d)) {
                let reg = new RegExp(r, "gi");
                allx_txt = allx_txt.replace(reg, replace_d[r]);
            }
        }
        // 获取选项列表
        xuan_txt_list = allx_txt.match(/[a-d][^a-z\u4e00-\u9fa5\d]?\s*.*?(?=[a-d][^a-z\u4e00-\u9fa5\d]?|$)/gi);
        if (!xuan_txt_list) {
            err_flag = false;
            sleep(200);
            continue;
        }
        if (xuan_txt_list && xuan_txt_list.length != radio_num) {
            xuan_txt_list = allx_txt.match(/[a-d][^a-z\u4e00-\u9fa5\d]\s*.*?(?=[a-d][^a-z\u4e00-\u9fa5\d]|$)/gi);
        }
        
        if (xuan_txt_list.length != 0) {
            let max_simi = 0;
            let right_xuan = '';
            let right_xuan2 = '';
            let ans_txt = '';
            for (let xuan_txt of xuan_txt_list) {
                let txt = xuan_txt.replace(/^[A-Z]\.?/gi, "");;
                for (let ans of ans_list) {
                    let similar = str_similar(ans.slice(2), txt);
                    if (similar > max_simi) {
                        max_simi = similar;
                        ans_txt = ans;

                        // 文本匹配优先
                        right_xuan2 = ans[0];
                        right_xuan = xuan_txt[0].toUpperCase();
                    }
                }
            }

            if (right_xuan != '') {
                let idx = idx_dict[right_xuan];
                try {className("android.widget.RadioButton").findOnce(idx).parent().click();}
                catch (e) {
                    idx = idx_dict[right_xuan2];
                    try {className("android.widget.RadioButton").findOnce(idx).parent().click();}
                    catch (e1) {
                        err_flag = false;
                        sleep(200);
                        continue;
                    }
                }
            }
            else {
                try {className("android.widget.RadioButton").findOnce().parent().click();}
                catch (e1) {
                    err_flag = false;
                    sleep(200);
                    continue;
                }
            }
        }
        else {
            err_flag = false;
            sleep(200);
            continue;
        }
        num++;
    }
}

// 把ocr结果转换为正序的字符串
function ocr_rslt_to_txt(result) {
    let top = 0;
    let previous_left = 0;
    let txt = "";
    let txt_list = [];
    for (let idx in result) {
        if (top == 0) {top = result[idx].bounds.top;}
        if (previous_left == 0) {previous_left = result[idx].bounds.left;}
        if (result[idx].bounds.top >= top-10 && result[idx].bounds.top <= top+10) {
            if (result[idx].bounds.left > previous_left) {txt = txt + "   " + result[idx].text;}
            else {txt = result[idx].text + "   " + txt;}
        }
        else {
            top = result[idx].bounds.top;
            txt_list.push(txt);
            txt = result[idx].text;
        }
        if (idx == result.length - 1) {txt_list.push(txt);}
        previous_left = result[idx].bounds.left;
    }
    //每行直接加个换行
    let ans = txt_list.join("\n");
    return ans;
}

// 通过缓存题库获取答案
function get_ans_by_tiku(que_txt) {
    let ans_list = [];
    let max_simi = 0;
    for (let ti of Object.keys(tiku)) {
        let ti_txt = ti.replace(/\[.+\]|^\d+\./g, "").replace(/[^\u4e00-\u9fa5\d]/g, "");
        let len = que_txt.length;
        let simi = str_similar(ti_txt.slice(0, len), que_txt);
        if (simi >= 0.25) {
            if (simi > max_simi) {
                ans_list.length = 0;
                ans_list.push(tiku[ti][1]);
                max_simi = simi;
            }
            else if (simi == max_simi) {ans_list.push(tiku[ti][1]);}
        }
    }
    return ans_list;
}

// 获取直链json
function get_tiku_by_http(link) {
    // 通过访问gitcode的数据直链
    if (!link) {link = "https://gitcode.net/McMug2020/XXQG_TiKu/-/raw/master/tiku_json.txt"}
    let req = http.get(link);
    // 更新题库时若获取不到，则退出
    if (req.statusCode != 200) {
        toast("题库无法获取");
        exit();
    }
    return req.body.json();
}

// 比较两个字符串相似度
function str_similar(str1, str2) {
    str1 = str1.replace(/[^\u4e00-\u9fa5\u2460-\u2469\wāáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜ]/g, "");
    str2 = str2.replace(/[^\u4e00-\u9fa5\u2460-\u2469\wāáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜ]/g, "");
    if (str1 == str2) {return 99;}
    if (str1.length > str2.length) {
        var muzi = str2;
        var instr = str1;
    }
    else {
        muzi = str1;
        instr = str2;
    }
    let reg = "/[" + muzi + "]{1}/g";
    let resu = instr.match(eval(reg));
    if (resu) {
        return (resu.length / instr.length);
    }
    else {return 0;}
}

// 屏幕宽高、方向初始化
function init_wh() {
  var device_w = depth(0).findOne().bounds().width();
  var device_h = depth(0).findOne().bounds().height();
  return [device_w, device_h]
}

/*
**********四人赛*********
*/
if (four_player_battle == "yes") {
    sleep(random_time(delay_time));

    if (!className("android.view.View").depth(21).text("学习积分").exists()) back_track();
    className("android.view.View").depth(21).text("学习积分").waitFor();
    entry_model(10);
    var num_2 = 0
    do_contest(4);
    num_2++
    do_contest(4);
}

/*
**********双人对战*********
*/
if (two_player_battle == "yes") {
    sleep(random_time(delay_time));

    if (!className("android.view.View").depth(21).text("学习积分").exists()) back_track();
    className("android.view.View").depth(21).text("学习积分").waitFor();
    entry_model(11);
    do_contest(2);
}

// 震动半秒
device.vibrate(500);
toast("脚本运行完成");
exit();
