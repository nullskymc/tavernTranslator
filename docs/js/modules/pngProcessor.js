/**
 * PNG处理模块 - 处理从PNG文件中提取和嵌入数据的功能
 */

const PngProcessor = {
  /**
   * 从PNG文件中提取嵌入的文本数据
   * @param {File} file PNG文件对象
   * @returns {Promise<Object>} 解析出的JSON数据
   */
  extractTextFromPng: async function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          
          // 验证PNG文件头
          const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
          for (let i = 0; i < pngSignature.length; i++) {
            if (bytes[i] !== pngSignature[i]) {
              reject(new Error('非法的PNG文件格式'));
              return;
            }
          }
          
          // 遍历PNG块
          let offset = pngSignature.length;
          while (offset < bytes.length) {
            // 读取块长度（4字节，大端序）
            const chunkLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | 
                               (bytes[offset + 2] << 8) | bytes[offset + 3];
            
            // 读取块类型（4字节ASCII）
            const chunkType = String.fromCharCode(
              bytes[offset + 4], bytes[offset + 5], 
              bytes[offset + 6], bytes[offset + 7]
            );
            
            // 检查是否为文本块
            if (chunkType === 'tEXt' || chunkType === 'zTXt') {
              // 获取块数据
              const chunkData = bytes.slice(offset + 8, offset + 8 + chunkLength);
              let textData;
              
              if (chunkType === 'zTXt') {
                // 解压缩zTXt数据（需要使用pako库）
                const nullTerminator = chunkData.indexOf(0);
                const compressionMethod = chunkData[nullTerminator + 1];
                if (compressionMethod !== 0) {
                  reject(new Error('不支持的压缩方法'));
                  return;
                }
                const compressedData = chunkData.slice(nullTerminator + 2);
                // 使用pako解压缩
                if (typeof pako === 'undefined') {
                  reject(new Error('缺少pako库，无法解压缩zTXt数据'));
                  return;
                }
                const decompressed = pako.inflate(compressedData);
                textData = new TextDecoder().decode(decompressed);
              } else {
                // 直接解码tEXt数据
                textData = new TextDecoder().decode(chunkData);
              }
              
              // 处理SillyTavern角色卡格式
              if (textData.startsWith('chara')) {
                textData = textData.substring(6); // 移除 'chara\0' 前缀
                try {
                  // 解码base64并解析JSON
                  const base64Data = textData;
                  const jsonStr = atob(base64Data);
                  const jsonData = JSON.parse(jsonStr);
                  resolve(jsonData);
                  return;
                } catch (error) {
                  reject(new Error('解析嵌入数据时出错: ' + error.message));
                  return;
                }
              }
            }
            
            // 移动到下一个块
            offset += 8 + chunkLength + 4; // 长度(4) + 类型(4) + 数据(chunkLength) + CRC(4)
          }
          
          reject(new Error('未找到嵌入的文本数据'));
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件时出错'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  },
  
  /**
   * 将文本数据嵌入PNG文件
   * @param {File} pngFile 原始PNG文件
   * @param {Object} textData 要嵌入的JSON数据
   * @returns {Promise<Blob>} 新的PNG文件Blob
   */
  embedTextIntoPng: async function(pngFile, textData) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          
          // 验证PNG文件头
          const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
          for (let i = 0; i < pngSignature.length; i++) {
            if (bytes[i] !== pngSignature[i]) {
              reject(new Error('非法的PNG文件格式'));
              return;
            }
          }
          
          // 收集除文本块外的所有PNG块
          const chunks = [];
          let offset = pngSignature.length;
          while (offset < bytes.length) {
            // 读取块长度
            const chunkLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | 
                               (bytes[offset + 2] << 8) | bytes[offset + 3];
            
            // 读取块类型
            const chunkType = String.fromCharCode(
              bytes[offset + 4], bytes[offset + 5], 
              bytes[offset + 6], bytes[offset + 7]
            );
            
            // 如果不是文本块，保存该块
            if (chunkType !== 'tEXt' && chunkType !== 'zTXt') {
              const chunk = {
                length: chunkLength,
                type: chunkType,
                data: bytes.slice(offset + 8, offset + 8 + chunkLength),
                crc: bytes.slice(offset + 8 + chunkLength, offset + 8 + chunkLength + 4)
              };
              chunks.push(chunk);
            }
            
            // 移动到下一个块
            offset += 8 + chunkLength + 4;
          }
          
          // 构造新的文本块
          const jsonStr = JSON.stringify(textData);
          const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));  // 确保正确处理UTF-8字符
          const textPayload = `chara\0${base64Data}`;
          const textBytes = new TextEncoder().encode(textPayload);
          
          // 创建tEXt块
          const chunkType = [116, 69, 88, 116]; // "tEXt" in ASCII
          
          // 计算CRC32 (使用自定义CRC32函数或库)
          const crc = this.calculateCRC32([...chunkType, ...textBytes]);
          
          // 构建新的PNG文件
          const resultBytes = [];
          
          // 添加PNG文件头
          resultBytes.push(...pngSignature);
          
          // 添加所有块，在IEND前插入tEXt块
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // 在IEND块前添加我们的文本块
            if (chunk.type === 'IEND' && i === chunks.length - 1) {
              // 添加文本块长度
              const lengthBytes = new Uint8Array(4);
              lengthBytes[0] = (textBytes.length >>> 24) & 0xff;
              lengthBytes[1] = (textBytes.length >>> 16) & 0xff;
              lengthBytes[2] = (textBytes.length >>> 8) & 0xff;
              lengthBytes[3] = textBytes.length & 0xff;
              resultBytes.push(...lengthBytes);
              
              // 添加文本块类型
              resultBytes.push(...chunkType);
              
              // 添加文本块数据
              resultBytes.push(...textBytes);
              
              // 添加文本块CRC
              const crcBytes = new Uint8Array(4);
              crcBytes[0] = (crc >>> 24) & 0xff;
              crcBytes[1] = (crc >>> 16) & 0xff;
              crcBytes[2] = (crc >>> 8) & 0xff;
              crcBytes[3] = crc & 0xff;
              resultBytes.push(...crcBytes);
            }
            
            // 添加原始块长度
            const lengthBytes = new Uint8Array(4);
            lengthBytes[0] = (chunk.length >>> 24) & 0xff;
            lengthBytes[1] = (chunk.length >>> 16) & 0xff;
            lengthBytes[2] = (chunk.length >>> 8) & 0xff;
            lengthBytes[3] = chunk.length & 0xff;
            resultBytes.push(...lengthBytes);
            
            // 添加原始块类型
            resultBytes.push(
              chunk.type.charCodeAt(0),
              chunk.type.charCodeAt(1),
              chunk.type.charCodeAt(2),
              chunk.type.charCodeAt(3)
            );
            
            // 添加原始块数据
            resultBytes.push(...chunk.data);
            
            // 添加原始块CRC
            resultBytes.push(...chunk.crc);
          }
          
          // 创建新的Blob并返回
          const resultBlob = new Blob([new Uint8Array(resultBytes)], {type: 'image/png'});
          resolve(resultBlob);
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件时出错'));
      };
      
      reader.readAsArrayBuffer(pngFile);
    });
  },
  
  /**
   * 计算CRC32校验和
   * @param {Array} bytes 字节数组
   * @returns {number} CRC32校验和
   */
  calculateCRC32: function(bytes) {
    // CRC32表
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    
    // 计算CRC32
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
};

export default PngProcessor;