import { jsPDF } from "jspdf"
import Sortable from "sortablejs"
import "./main.css"

const padding = 0.05

function getPdfSize(pdf: jsPDF): [number, number] {
	return [pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight()]
}

type GeneralImage = HTMLCanvasElement | HTMLImageElement

function generatePdf(images: GeneralImage[]): jsPDF {
	const pdf = new jsPDF({ compress: true })
	const pageSize = getPdfSize(pdf)
	let isFirstPage = true
	for (const image of images) {
		if (!isFirstPage) {
			pdf.addPage()
		} else {
			isFirstPage = false
		}
		const imageProportions = image.height / image.width
		let imageWidth: number
		let imageHeight: number

		if (imageProportions > 1) {
			// The image is tall
			imageHeight = pageSize[1] * (1 - 2 * padding)
			imageWidth = imageHeight / imageProportions
		} else {
			// The image is wide
			imageWidth = pageSize[0] * (1 - 2 * padding)
			imageHeight = imageWidth * imageProportions
		}
		pdf.addImage(
			image,
			pageSize[0] * padding,
			pageSize[1] * padding,
			imageWidth,
			imageHeight,
			undefined,
			"SLOW"
		)
	}
	return pdf
}

const imageList = document.querySelector<HTMLDivElement>("#imageList")!

const downloadButton =
	document.querySelector<HTMLButtonElement>("#downloadButton")!

downloadButton.addEventListener("click", () => {
	const images = Array.from(imageList.children).map(
		imagelet => imagelet.querySelector<GeneralImage>(".imageletImage")!
	)
	const pdf = generatePdf(images)
	pdf.save("spm.pdf")
})

function updateDownloadButtonStatus(): void {
	downloadButton.disabled = imageList.childElementCount === 0
}

const sortable = new Sortable(imageList, {
	animation: 150,
})

function rotateImage(inputImage: GeneralImage): GeneralImage {
	const canvas = document.createElement("canvas")
	const imageSize = [inputImage.width, inputImage.height]
	canvas.width = imageSize[1]
	canvas.height = imageSize[0]

	const ctx = canvas.getContext("2d")!

	ctx.translate(imageSize[1] / 2, imageSize[0] / 2)
	ctx.rotate(Math.PI / 2)

	ctx.drawImage(inputImage, -imageSize[0] / 2, -imageSize[1] / 2)

	return canvas
}

// Redraw the image on a pixel space to get rid of all the annoying EXIF data
function remakeImage(image: GeneralImage): GeneralImage {
	const canvas = document.createElement("canvas")
	canvas.width = image.width
	canvas.height = image.height

	const ctx = canvas.getContext("2d")!

	ctx.drawImage(image, 0, 0)

	return canvas
}

async function makeImagefromBlob(imageBlob: Blob): Promise<HTMLImageElement> {
	return new Promise((res, rej) => {
		const url = URL.createObjectURL(imageBlob)
		const image = document.createElement("img")
		image.addEventListener("load", () => {
			res(image)
		})
		image.addEventListener("error", ev => {
			rej(ev.error)
		})
		image.src = url
	})
}

const imageletTemplate =
	document.querySelector<HTMLTemplateElement>("#imageletTemplate")!

function prepareImageletImage(image: GeneralImage): void {
	image.draggable = false
	image.classList.add("imageletImage")
}

function makeImagelet(image: GeneralImage): void {
	const imageletFragment = imageletTemplate.content.cloneNode(
		true
	) as DocumentFragment
	const imagelet = imageletFragment.firstElementChild! as HTMLDivElement

	const templateImage = imagelet.querySelector("img")!
	imagelet.replaceChild(image, templateImage)

	// TODO Automatically inherit the OG image's attributes?
	prepareImageletImage(image)

	const removeButton =
		imagelet.querySelector<HTMLButtonElement>(".removeButton")!
	removeButton.addEventListener("click", () => {
		imagelet.remove()
		updateDownloadButtonStatus()
	})
	const rotateButton =
		imagelet.querySelector<HTMLButtonElement>(".rotateButton")!
	rotateButton.addEventListener("click", () => {
		const currentImage = imagelet.querySelector<GeneralImage>(".imageletImage")!
		const newImage = rotateImage(currentImage)
		prepareImageletImage(newImage)
		imagelet.replaceChild(newImage, currentImage)
	})

	imageList.appendChild(imagelet)
	updateDownloadButtonStatus()
}

async function loadFiles(fileList: FileList): Promise<void> {
	const files = [...fileList]
	// The default iteration order in a `FileList` is seemingly arbitrary and on
	// some platforms useless, so actually sort the files by their modify date
	files.sort((a, b) => a.lastModified - b.lastModified)
	for (const file of files) {
		let image: GeneralImage = await makeImagefromBlob(file)
		image = remakeImage(image)
		makeImagelet(image)
	}
}

const fileInput = document.querySelector<HTMLInputElement>("#fileInput")!

const addImageButton =
	document.querySelector<HTMLButtonElement>("#addImageButton")!

addImageButton.addEventListener("click", () => {
	fileInput.click()
})

fileInput.addEventListener("input", async () => {
	if (!fileInput.files) return
	loadFiles(fileInput.files)
})

const removeAllButton =
	document.querySelector<HTMLButtonElement>("#removeAllButton")!

removeAllButton.addEventListener("click", () => {
	for (const child of Array.from(imageList.children)) {
		child.remove()
	}
	updateDownloadButtonStatus()
})

document.body.addEventListener("dragover", ev => {
	if (!ev.dataTransfer) return
	ev.preventDefault()
	ev.dataTransfer.dropEffect = "copy"
})

document.body.addEventListener("drop", ev => {
	if (!ev.dataTransfer) return
	ev.preventDefault()
	loadFiles(ev.dataTransfer.files)
})
