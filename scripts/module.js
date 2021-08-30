class GlobalTagsManager{

	/**
	 * Adds tags to an object
	 *
	 * @param	{object} 			inObject	The object get tags from
	 * @returns {array} 						The tags on the objects in an array
	 */
	getTags(inObject){
		if(inObject.document) inObject = inObject.document;
		return inObject.getFlag("global-tags", "tags") || [];
	}

	/**
	 * Adds tags to an object
	 *
	 * @param 	{string|array}		inTags		An array of tags or a string of tags (separated by spaces) that will be searched for
	 * @param 	{object} 			options		Options (TBD)
	 * @returns {Promise} 						A promise that will resolve when all objects have been found, returning an array of objects
	 */
	getByTag(inTags, options = {}){

		return new Promise(resolve => {

			inTags = this._validateTags(inTags, "getByTag");

			let testTags = inTags
				.replace(/[^A-Za-z0-9 .*_-]/g, "")
				.replace(".", "\.")
				.replace("*", "(.*?)")
				.split(" ")
				.map(s => new RegExp(s));

			let objs = new Set();
			canvas.layers.forEach(l => {
				l?.objects?.children.forEach(obj => {
					let testObj = obj;
					if (testObj.document) testObj = testObj.document;
					let tags = this.getTags(testObj);
					if (tags && this._testTags(testTags, tags.split(" "), options)) objs.add(obj);
				});
			})

			resolve(Array.from(objs));

		});

	}

	/**
	 * Adds tags to an object
	 *
	 * @param 	{object} 		inObject	The object to add tags to
	 * @param 	{string|array} 	inTags		An array of tags or a string of tags (separated by spaces) that will be added to the object
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	async addTags(inObject, inTags){

		if(inObject.document) inObject = inObject.document;

		inTags = this._validateTags(inTags, "addTags");

		let tags = this.getTags(inObject);

		if(tags){
			tags = new Set([...tags, ...inTags])
		}else{
			tags = new Set(inTags)
		}

		return await inObject.setFlag("global-tags", "tags", Array.from(tags))

	}

	/**
	 * Removes tags from an object
	 *
	 * @param 	{object} 		inObject	The object to remove tags from
	 * @param 	{string|array} 	inTags		An array of tags or a string of tags (separated by spaces) that will be removed from the object
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	async removeTags(inObject, inTags){

		if(inObject.document) inObject = inObject.document;

		inTags = this._validateTags(inTags, "removeTags");

		let tags = this.getTags(inObject);

		if(tags) tags = new Set(tags)

		inTags.forEach(t => {
			tags.delete(t);
		})

		return await inObject.setFlag("global-tags", "tags", Array.from(tags))

	}

	_validateTags(inTags, functionName){
		if(!(typeof inTags === "string" || Array.isArray(inTags))) throw new Error(`GlobalTags | ${functionName} | inTags must be of type string or array`);

		if(typeof inTags === "string") inTags = inTags.split(" ");

		if(Array.isArray(inTags)) inTags = inTags.join(" ");

		inTags.forEach(t => {
			if(typeof t !== "string") throw new Error(`GlobalTags | ${functionName} | tags in array must be of type string`);
		})

		return inTags;
	}

	_testTags(inTestTags, inTags, options){

		let matches = inTestTags.filter(testTag => {
			return inTags.filter(tag => {
				return testTag.test(tag);
			}).length;
		})

		if(options.matchAll){
			return matches.length === inTags.length;
		}

		return matches.length;
	}

}



Hooks.once('ready', async function() {

	window.GlobalTags = new GlobalTagsManager();

});