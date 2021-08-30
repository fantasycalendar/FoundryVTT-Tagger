class GlobalTagsManager{

	/**
	 * Adds tags to an object
	 *
	 * @param	{object} 			inObject	The object get tags from
	 * @returns {array} 						The tags on the objects in an array
	 */
	getTags(inObject){
		if(inObject?.document) inObject = inObject.document;
		return inObject?.getFlag("global-tags", "tags") || [];
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

			inTags = this._validateTags(inTags, "getByTag")
				.join(" ")
				.replace(/[^A-Za-z0-9 .*_-]/g, "")
				.replace(".", "\.")
				.replace("*", "(.*?)")
				.split(" ")
				.map(s => new RegExp(s));

			let objs = new Set();
			canvas.layers.forEach(l => {
				l?.objects?.children.forEach(obj => {
					let tags = this.getTags(obj);
					if (tags && this._testTags(inTags, tags, options)) objs.add(obj);
				});
			})

			resolve(Array.from(objs));
		});
	}

	/**
	 * Adds tags to an object
	 *
	 * @param 	{object|array}	inObjects	An object or a list of objects to add tags to
	 * @param 	{string|array} 	inTags		An array of tags or a string of tags (separated by spaces) that will be added to the object
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	async addTags(inObjects, inTags){
		inTags = this._validateTags(inTags, "addTags");
		return this._updateTags(inObjects, inTags);
	}

	/**
	 * Removes tags from an object
	 *
	 * @param 	{object|array}	inObjects	An object or a list of objects to remove tags from
	 * @param 	{string|array} 	inTags		An array of tags or a string of tags (separated by spaces) that will be removed from the object
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	async removeTags(inObjects, inTags){
		inTags = this._validateTags(inTags, "removeTags");
		return this._updateTags(inObjects, inTags, false);
	}

	/**
	 * Removes all tags from an object
	 *
	 * @param 	{object|array}	inObjects	The object to remove all tags from
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	async clearAllTags(inObjects){
		return this._updateTags(inObjects, false);
	}

	/**
	 * Updates tags on the object
	 *
	 * @param 	{object|array}	inObjects	The object to remove all tags from
	 * @param 	{array|boolean}	inTags		The tags to update the object with, or false if clearing all tags
	 * @param 	{boolean}		isAdding		The tags to update the object with, or false if clearing all tags
	 * @returns {promise} 					A promise that will resolve when the object's tags have been updated
	 */
	_updateTags(inObjects, inTags, isAdding = true ){
		inObjects = this._validateObjects(inObjects);
		return new Promise(async (resolve) => {
			for(let obj of inObjects){
				if(inTags){
					let tags = this.getTags(obj);
					if(tags) tags = new Set(tags);
					if(isAdding){
						tags = new Set([...tags, ...inTags]);
					}else{
						inTags.forEach(t => tags.delete(t));
					}
					if(tags.size === 0){
						await obj.unsetFlag("global-tags", "tags");
						continue;
					}
					await obj.setFlag("global-tags", "tags", Array.from(tags));
				}else{
					await obj.unsetFlag("global-tags", "tags");
				}
			}
			resolve();
		})
	}

	_validateTags(inTags, functionName){
		if(!(typeof inTags === "string" || Array.isArray(inTags))) throw new Error(`GlobalTags | ${functionName} | inTags must be of type string or array`);

		if(typeof inTags === "string"){
			inTags = inTags.split(" ");
		}

		inTags.forEach(t => {
			if(typeof t !== "string") throw new Error(`GlobalTags | ${functionName} | tags in array must be of type string`);
		});

		return inTags;
	}

	_validateObjects(inObjects){
		if(!Array.isArray(inObjects)) inObjects = [inObjects];
		inObjects = inObjects.map(o => o?.document ?? o);
		return inObjects;
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