exports.showIndex = function(req,res){
	console.log('123');
	console.log(str);
	res.render("login");
}


exports.create = function(req,res){
	res.render("create");
}