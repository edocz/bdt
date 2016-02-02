var async 	= require('async'),
	request = require('request'),
	prompt  = require('prompt'),
	config  = require('nconf'),
	qs      = require('querystring'),
	fs      = require('fs'),
	open 	= require('open');

var apis = {
	df: {
		description	: 	'查看容量',
		execute		:	df
	},
	put: {
		description	: 	'上传文件',
		execute		:	put
	},
	get: {
		description	: 	'下载文件',
		execute		:	get
	},
	mkdir: {
		description	: 	'创建目录',
		execute		: 	mkdir
	},
	stat: {
		description	: 	'查看文件',
		execute		:	stat
	},
	ls: {
		description	: 	'列出文件',
		execute		: 	ls
	},
	mv: {
		description	: 	'移动文件',
		execute		: 	mv
	},
	cp: {
		description	: 	'复制文件',
		execute		: 	cp
	},
	rm: {
		description	: 	'删除文件',
		execute		: 	rm
	},
	find: {
		description	: 	'查找文件',
		execute		: 	find
	},
	wget: {
		description	:	'离线下载',
		execute		:	wget
	}
};
	
// catch uncaught Exception and exit
process.on('uncaughtException', function (err) {
  console.log(err);
  process.exit(1)
})

config.argv().env().file({ file: 'config.json' });

prompt.message = '';
prompt.delimiter = '';
prompt.start();

var access_token  = config.get('access_token'),
	refresh_token = config.get('refresh_token'),
	client_id	  = 'dOHsSlhlVUYMerj7DdT7RZHZ',
	client_secret = '6s4IzTLxWEtV8mA7PO8dAL8jYcMP7ZoE';

if (access_token === undefined && refresh_token === undefined) {
	console.log('未发现AccessToken, 即将初始化AccessToken');
	initAccessToken();
} else {
	main();
}

function main () {
	// console.log('选择要执行的命令?');
	// for (api in apis) {
	// 	console.log(apis[api].description, api);
	// }

	prompt.get(['command'], function (err, result) {
		if (err) { return 1; }
		commandHandler(result.command);
	});
}

function initAccessToken () {
	async.waterfall([
		function deviceCode(callback) {
			var params = {
				client_id     : client_id,
				response_type : 'device_code',
				scope         : 'basic,netdisk'
			}
			var url = 'https://openapi.baidu.com/oauth/2.0/device/code?' + qs.stringify(params);
			request.post(url, function (err, response, body) {
				if (err) return console.log(err);
				var json = JSON.parse(body);
				// console.log(json);
				callback(null, json);
			});
		},
		function verifyCode(json, callback) {
			open('http://openapi.baidu.com/device?display=page&code=' + json.user_code);
			// console.log('访问 http://openapi.baidu.com/device');
			// console.log('输入 ' + json.user_code);
			// console.log('验证成功后按回车继续!');
			
			prompt.get(['isDone'], function (err, result) {
				if (err) { return 1; }
				callback(null, json);
			});
		},
		function accessToken(json, callback) {
			var params = {
				grant_type    : 'device_token',
				client_id     : client_id,
				client_secret : client_secret,
				code          : json.device_code,
			};
			var url = 'https://openapi.baidu.com/oauth/2.0/token?' + qs.stringify(params);
			request.post(url, function (err, response, body) {
				if (err) return console.log(err);
				var resp_body = JSON.parse(body);
				console.log('AccessToken: ', resp_body.access_token);
				callback(null, resp_body);
			});
		},
		function saveToken(json, callback) {
			config.set('access_token', 		json.access_token);
			config.set('refresh_token', 	json.refresh_token);
			config.set('session_secret', 	json.session_secret);
			config.set('session_key', 		json.session_key);
			config.set('scope', 			json.scope);
			config.set('expires_in', 		json.expires_in);
			
			config.save(function (err) {
				if (err) return console.log(err);
				console.log('保存配置成功!');
				callback(null, 'success');
			});
		}
	], function(err, result) {
		if (err) return;
		access_token  = config.get('access_token');
		refresh_token = config.get('refresh_token');
		process.nextTick(main);
	});
}

function commandHandler(command) {
	var fn = apis[command].execute;
	if (undefined !== fn && typeof(fn) === 'function') {
		fn();
	} else {
		console.log('不存在命令:', command);
	}
}

function df() {
	var params = {
		method       : 'info',
		access_token : access_token
	};
	var url = 'https://pcs.baidu.com/rest/2.0/pcs/quota?' + qs.stringify(params);

	request.post(url, function (err, response, body) {
		if (err) return console.log(err);
		var json = JSON.parse(body);
		console.log('总量: ', Math.floor(json.quota/1024/1024/1024), 'GB');
		console.log('已用: ', Math.floor(json.used/1024/1024/1024), 'GB');
		process.nextTick(main);
	});
}

function put() {
	prompt.get(['src', 'dst'], function (err, result) {
		if (err) { return 1; }
		console.log('源文件:', result.src);
		console.log('目标文件:', result.dst);
		
		var params = {
			method       : 'upload',
			path         : result.dst,
			access_token : access_token
		}
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		var req = request.post(url, function (err, response, body) {
			if (err) return console.log(err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
		req.form().append('file', fs.createReadStream(result.src));
	});
}

function puts() {
	prompt.get(['src', 'dst'], function (err, result) {
		if (err) { return 1; }
		console.log('源文件:', result.src);
		console.log('目标文件:', result.dst);
		
		var params = {
			method       : 'createsuperfile',
			path         : result.dst,
			access_token : access_token
		}
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		var req = request.post(url, function (err, response, body) {
			if (err) return console.log(err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
		req.form().append('file', fs.createReadStream(result.src));
	});	
}

function get() {
	prompt.get(['src', 'dst'], function (err, result) {
		if (err) { return 1; }
		console.log('文件名:', result.src);
		console.log('存放路径:', result.dst);

		var params = {
			method       : 'download',
			path         : result.src,
			access_token : access_token
		};
		var url = 'https://d.pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);
		request.get(url).pipe(fs.createWriteStream(result.dst));
		process.nextTick(main);
	});
}

function mkdir() {
	prompt.get(['dir'], function (err, result) {
		if (err) { return 1; }
		console.log('输入目录名:', result.dir);

		var params = {
			method       : 'mkdir',
			access_token : access_token,
			path         : result.dir
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log(err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function stat() {
	prompt.get(['dir'], function (err, result) {
		if (err) { return 1; }
		console.log('请输入要查看的文件名或目录名:', result.dir);

		var params = {
			method       : 'meta',
			access_token : access_token,
			path         : result.dir
		}
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log(err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function ls() {
	prompt.get(['dir'], function (err, result) {
		if (err) { return 1; }
		console.log('输入目录名:', result.dir);

		var params = {
			method       : 'list',
			access_token : access_token,
			path         : result.dir
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log(err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function mv() {
	prompt.get(['from', 'to'], function (err, result) {
		if (err) { return 1; }
		console.log('源文件:', result.from);
		console.log('目的文件:', result.to);

		var params = {
			method       : 'move',
			access_token : access_token,
			from         : result.from,
			to           : result.to
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log('error ', err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function cp() {
	prompt.get(['from', 'to'], function (err, result) {
		if (err) { return 1; }
		console.log('源文件:', result.from);
		console.log('目的文件:', result.to);

		var params = {
			method       : 'copy',
			access_token : access_token,
			from         : result.from,
			to           : result.to
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log('error ', err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function rm() {
	prompt.get(['path'], function (err, result) {
		if (err) { return 1; }
		console.log('删除文件:', result.path);

		var params = {
			method       : 'delete',
			access_token : access_token,
			path         : result.path
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log('error ', err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function find() {
	prompt.get(['path', 'keyword'], function (err, result) {
		if (err) { return 1; }
		console.log('查找文件:', result.path);

		var params = {
			method       : 'search',
			access_token : access_token,
			path         : result.path,
			wd           : result.keyword,
			re           : 1 // 默认递归
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/file?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log('error ', err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}

function wget() {
	prompt.get(['url', 'dir'], function (err, result) {
		if (err) { return 1; }

		var params = {
			method       : 'add_task',
			access_token : access_token,
			save_path    : result.dir,
			source_url   : result.url
		};
		var url = 'https://pcs.baidu.com/rest/2.0/pcs/services/cloud_dl?' + qs.stringify(params);

		request.post(url, function (err, response, body) {
			if (err) return console.log('error ', err);
			var json = JSON.parse(body);
			console.log(json);
			process.nextTick(main);
		});
	});
}
// update this
