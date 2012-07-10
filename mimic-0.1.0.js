/**
 * Mimic
 * @desc A small Javascript HTML templating utility
 * @author Eric Bobbitt (eric@hellouser.net)
 * @version 0.1.0
 
 FreeBSD License
 
 Copyright 2011 Eric Bobbitt. All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are
 permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this list of
       conditions and the following disclaimer.

    2. Redistributions in binary form must reproduce the above copyright notice, this list
       of conditions and the following disclaimer in the documentation and/or other materials
       provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY ERIC BOBBITT ``AS IS'' AND ANY EXPRESS OR IMPLIED
 WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 The views and conclusions contained in the software and documentation are those of the
 authors and should not be interpreted as representing official policies, either expressed
 or implied, of Eric Bobbitt.
 
*/

if(typeof Mimic == 'undefined') { Mimic = {}; }

(function() {
    
    var regex = {
        //'foreach':          /(\{#foreach.*?\})((?!\{#foreach).*?)(\{#endforeach\})/gim,
        //'foreach':          /(\{#foreach.*?\}(?!\{#foreach))(.(?!\{#foreach)*?)(\{#endforeach\})/gim,
        'foreach':          /\{#foreach\s.*?\}/gim,
        'endforeach':       /\{#endforeach\}/gim,
        'foreach_items':    /(\{#foreach.*?\s)(.*?)\sas\s(.*?)\}/gi,
        'tag':              /\{#(.*?)\}/gi
    };
    
    regex.subtag = function( name ) {
        return new RegExp('\{#' + name + '(.*?)\}', 'gi');
    };
    
    var remove_linebreaks = function( str ) {
        str = str.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g, " ");
        return str;
    };
    
    var last_foreach_block     = false;
    var use_last_foreach_chunk = false;
    var foreach_tags           = false;
    
    var _data = {};
    
    var f = function() {};
    Mimic = f.prototype;
    
    Mimic.templates = {};

    Mimic.loadTemplate = function() {
        
    };
    
    /**
     *  Load DOM Template
     *  Loads a template into Mimic.templates
     *  @param string   DOM selector (Can be an id or classname distinguished by prefixing the selector with '#' or '.' respectively)
     *  @param string   (optional) Template Group
     */
    Mimic.loadDomTemplate = function( selector, group ) {
        if( !selector || selector == '' ) { return false; }
        if( !group )                      { group = 'default'; }
        
        var start    = selector.charAt(0);
        var elements = false;
        
        // Grab the element(s) from the DOM
        if( start === "." ) {
            elements = document.body.getElementsByClassName( selector.substring(1) );
        } else if( start === '#' ) { 
            elements = document.getElementById( selector.substring(1) );
        } else if ( (start != '#') && (start != '.') ) {
            if(document.getElementById( selector )) {
                elements = document.getElementById( selector );
            } else if( document.body.getElementsByClassName( selector ) ) {
                elements = document.body.getElementsByClassName( selector );
            }
        }
        if(!elements) { return false; }
        
        // Create the group if it doesn't exist
        if(typeof Mimic.templates[group] == 'undefined' ) { Mimic.templates[group] = {}; }
        
        // Load the element(s) contents into the Mimic.templates object if a name exists
        if(typeof elements.length == 'undefined' ) {
            var name = elements.getAttribute('mimic_name');
            if(name && name != '') {
                Mimic.templates[group][name] = remove_linebreaks(elements.innerHTML);
            }
        } else {
            var len = elements.length;
            for( var i = 0; i < len; i++ ) {
                var el   = elements[i]
                var name = el.getAttribute('mimic_name');
                if(name && name != '') {
                    Mimic.templates[group][name] = remove_linebreaks(el.innerHTML);
                }
            }
        }
    };
    
    Mimic.set = function( name, value ) {
        _data[name] = value;
    };
    
    var get_foreach_tags = function( src ) {
        var foreach_parsing    = true;
        var start_len, end_len = false;
        var start_ref, end_ref = false;
        var foreach_start      = [];
        var foreach_end        = [];
        var foreach_pairs      = [];
        
        // Make a pass for the start & end tags respectively.
        while( start_ref = regex['foreach'].exec(src) )    { foreach_start.push((regex['foreach'].lastIndex - start_ref[0].length));  }
        while( end_ref   = regex['endforeach'].exec(src) ) { foreach_end.push((regex['endforeach'].lastIndex)); }
        
        //console.log([91, 134, 198, 295, 367, 473, 584]);
        //console.log([133, 352, 366, 424, 450, 569, 583]);

        start_len = foreach_start.length;
        end_len   = foreach_end.length;
        if(start_len == end_len) {
            if(start_len > 0) {
                var loop = 0;
                while( foreach_parsing && loop < 1000 ) {
                    var min  = foreach_start[loop];
                    var max  = foreach_start[loop + 1];
                    var test = foreach_end[0];
                    if(!max || test > min && test < max) {
                        if(min < test) {
                            foreach_pairs.push({ children: [], start: foreach_start[loop], end: foreach_end[0], size: (foreach_end[0] - foreach_start[loop]), parents: loop });
                        }
                        foreach_start.splice(loop, 1);
                        foreach_end.splice(0, 1);
                        loop = 0;
                    } else {
                        loop++;
                    }
                    if(foreach_start.length == 0) { 
                        foreach_parsing = false;
                    }
                }
            }            
            return foreach_pairs;
        } else {
            throw "{#foreach} ... {#endforeach} mismatch";
        }
    };
    
    var compile_foreach_chunk = function(chunk, items, subname, data ) {
        if(!data[items] || !data[items] instanceof Array || data[items].length == 0) {
            chunk = '';
        } else {
            var iterate = data[items].length;
            var loop    = '';
            var tag     = new RegExp('\{#' + subname + '\.(.*?)\}', 'gi');
            var matches = chunk.match(tag);
            var len     = matches.length;
            
            for(var i = 0; i < iterate; i++) {
                var add_loop = chunk;
                for(var n = 0; n < len; n++) {
                    var obj     = matches[n].replace('{#' + subname, '').replace('}', '').split('.');
                    obj.shift();
                    var obj_len = obj.length;
                    var _data   = '';
                    if(data[items][i][obj[0]]) { _data = data[items][i][obj[0]]; }
                    for(var x = 1; x < obj_len; x++) {
                        try {
                            if(_data[obj[x]]) {
                                _data = _data[obj[x]];
                            } else {
                                _data = '';
                            }
                        } catch(e) { _data = ''; }
                    }
                    add_loop = add_loop.replace(matches[n], _data);
                }
                loop += add_loop;
            }
            
            chunk = loop;
            
        }
        return chunk;
    };
    
    var parse_foreach_block = function( src, block, data, key ) {
        var chunk = src.substr(block.start, (block.end - block.start));
        
        // test to make sure we have the correct foreach structure
        var tokens = chunk.match(regex['foreach_items']);
        var reg    = new RegExp(regex['foreach_items']);
        var keys   = reg.exec(tokens[0]);
        if(!keys || keys.length < 4) throw "{#foreach} is malformed.";
        
        items   = keys[2];
        subname = keys[3];
        
        // parse out non-nested blocks
        if(tokens.length == 1) {
            chunk = chunk.replace(regex['foreach_items'], '');
            chunk = chunk.replace(regex['endforeach'], '');
            chunk = compile_foreach_chunk(chunk, items, subname, data );
        } else {
            var nest_iterate = (tokens.length);
            var size         = 0;
            console.log(nest_iterate, chunk);
            for(var i = 1; i < nest_iterate; i++) {
                var last_block = foreach_tags[(key - i)];
                console.log(last_block.parents);
                var sub_chunk = chunk.substr( (last_block.start - block.start) + size, last_block.size);
                size += (last_block.chunk_size);
                console.log('sub_chunk:', sub_chunk);
                console.log('last_chunk:', last_block.chunk);
                chunk = chunk.replace(sub_chunk, last_block.chunk);
                
                console.log('final_chunk:', chunk);
            }
            chunk = chunk.replace(regex['foreach_items'], '');
            chunk = chunk.replace(regex['endforeach'], '');
            chunk = compile_foreach_chunk(chunk, items, subname, data );
            
        }
        
        last_foreach_block = block;
        
        block.chunk = chunk;
        block.chunk_size = chunk.length;
        
        return data;
    };
    
    Mimic.parse = function( name, group ) {
        var data = _data;
        _data = {};
        
        if(!group) { group = 'default'; }
        
        var src = this.templates[group][name];
        if(!src) { return false; }
        
        var trim = function( str ) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        };
        
        // parse the first {#var} match
        var parse_tags = function() {
            var matches, match = false;
            while( match = regex['tag'].exec(src) ) { matches = match; }
            if(!matches) return false;
            
            var val = '';
            if(data[matches[1]]) { val = data[matches[1]]; }
            src = src.replace(matches[0], val);
            
            return true;
        };
        
        
        foreach_tags = get_foreach_tags( src );
        console.log(foreach_tags);
        for(var i = 0; i < foreach_tags.length; i++ ) {
            parse_foreach_block( src, foreach_tags[i], data, i );
        }
        
        var size = 0;
        for(var n = 0; n < foreach_tags.length; n++ ) {
            var block = foreach_tags[n];
            if(!block.parents) {
                var src1 = src.substr(0, block.start + size);
                var src2 = src.substr(block.end + size);
                src = src1 + block.chunk + src2;
                size += (block.chunk_size - block.size);
            }
        }
        // parse data
        var tags_parsed = false;
        while( !tags_parsed ) { var test = parse_tags(); if(!test) { tags_parsed = true; } }
        
        // print output
        //console.log(src);
        return src;
    };
    
    return Mimic;
})();