import { jsPDF } from "jspdf"
import Sortable from "sortablejs"
import "./main.css"

const padding = 0.05

function getPdfSize(pdf: jsPDF): [number, number] {
	return [pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight()]
}

function generatePdf(images: HTMLImageElement[]): jsPDF {
	const pdf = new jsPDF()
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
			imageHeight
		)
	}
	return pdf
}

const imageList = document.querySelector<HTMLDivElement>("#imageList")!

const downloadButton =
	document.querySelector<HTMLButtonElement>("#downloadButton")!

downloadButton.addEventListener("click", () => {
	const images = Array.from(imageList.children).map(
		imagelet => imagelet.querySelector<HTMLImageElement>("img")!
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

function makeImagelet(image: HTMLImageElement): void {
	const imageletFragment = imageletTemplate.content.cloneNode(
		true
	) as DocumentFragment
	const imagelet = imageletFragment.firstElementChild! as HTMLDivElement

	const templateImage = imagelet.querySelector("img")!
	imagelet.replaceChild(image, templateImage)

	// TODO Automatically inherit the OG image's attributes?
	image.draggable = false

	const removeButton =
		imagelet.querySelector<HTMLButtonElement>(".removeButton")!
	removeButton.addEventListener("click", () => {
		imagelet.remove()
		updateDownloadButtonStatus()
	})

	imageList.appendChild(imagelet)
	updateDownloadButtonStatus()
}

async function loadFiles(files: FileList): Promise<void> {
	for (const file of files) {
		const image = await makeImagefromBlob(file)
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
